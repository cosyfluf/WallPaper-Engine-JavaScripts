'use strict';

// Registrieren des Audio-Buffers, um auf Audiofrequenzen zugreifen zu können.
// AUDIO_RESOLUTION_16 liefert 16 Frequenzbänder, wobei Index 0 die tiefsten Bässe darstellt.
const audioBuffer = engine.registerAudioBuffers(engine.AUDIO_RESOLUTION_16);

// Der aktuell gerenderte Farbwert, der sich sanft ändert.
let currentColor = new Vec3(0, 0, 0); // Startet standardmäßig in Schwarz (RGB: 0, 0, 0)

// Der Zielfarbwert, zu dem hin überblendet wird, wenn sich das Thumbnail ändert.
let targetColor = new Vec3(0, 0, 0);

// Konfigurationsparameter für den Übergang und den Basseffekt
// Je kleiner der Wert, desto langsamer/sanfter der Übergang (0.0 bis 1.0).
const SMOOTHING_FACTOR = 0.05;
// Intensität des Basseffekts (passt an, wie stark die Farbe auf den Bass reagiert).
const BASS_EFFECT_INTENSITY = 0.1;

/**
 * Hilfsfunktion für die lineare Interpolation eines einzelnen Zahlenwerts.
 * @param {number} start - Startwert
 * @param {number} end - Endwert
 * @param {number} alpha - Interpolationsfaktor (0.0 bis 1.0)
 * @return {number} - Der interpolierte Wert
 */
function lerp(start, end, alpha) {
    return start + (end - start) * alpha;
}

/**
 * Diese Funktion wird bei jedem Frame aufgerufen, um den aktuellen Farbwert zu aktualisieren.
 * @param {Vec3} value - Der aktuelle Eigenschaftswert (hier: 'clearcolor')
 * @return {Vec3} - Der aktualisierte Eigenschaftswert
 */
export function update() {
    // Berechne den Delta-Zeit-Wert, um die Animation bildratenunabhängig zu machen.
    // engine.frametime ist die Zeit seit dem letzten Frame in Sekunden.
    // Wir multiplizieren mit 60, um einen Faktor für eine typische 60 FPS-Rate zu erhalten.
    const dt = engine.frametime * 60;

    // Berechne den Alpha-Wert für die Interpolation, der eine frameratenunabhängige Glättung ermöglicht.
    // Dies verhindert, dass der Übergang bei höheren FPS schneller abläuft.
    const alpha = 1 - Math.pow(1 - SMOOTHING_FACTOR, dt);

    // Wende die lineare Interpolation auf jede RGB-Komponente an, um eine sanfte Überblendung
    // von der aktuellen Farbe zur Zielfarbe zu erreichen.
    currentColor.x = lerp(currentColor.x, targetColor.x, alpha);
    currentColor.y = lerp(currentColor.y, targetColor.y, alpha);
    currentColor.z = lerp(currentColor.z, targetColor.z, alpha);

    // Holen des Bass-Amplitudenwerts.
    // audioBuffer.average[0] enthält die Lautstärke der tiefsten Frequenzen (Bass).
    // Der Wert kann über 1.0 liegen, daher begrenzen wir ihn auf maximal 1.0,
    // um eine übermäßige Aufhellung/Sättigung zu vermeiden.
    const bass = Math.min(audioBuffer.average[0] || 0, 1.0);

    // Wende einen leichten Basseffekt an.
    // Hier wird die Farbe leicht aufgehellt, basierend auf der Bass-Amplitude.
    // Erstelle eine Kopie der aktuellen Farbe, um den Basseffekt darauf anzuwenden.
    let finalColor = new Vec3(currentColor.x, currentColor.y, currentColor.z);

    // Addiere einen kleinen Betrag zu jeder Farbkomponente, skaliert mit dem Bass und der Intensität.
    // Stelle sicher, dass die Farbkomponenten 1.0 (Maximum) nicht überschreiten.
    finalColor.x = Math.min(finalColor.x + bass * BASS_EFFECT_INTENSITY, 1.0);
    finalColor.y = Math.min(finalColor.y + bass * BASS_EFFECT_INTENSITY, 1.0);
    finalColor.z = Math.min(finalColor.z + bass * BASS_EFFECT_INTENSITY, 1.0);

    return finalColor;
}

/**
 * Diese Funktion wird aufgerufen, wenn sich das primäre Miniaturbild ändert (z.B. bei einem neuen Medium).
 * @param {MediaThumbnailEvent} event - Das Event-Objekt, das die neue Primärfarbe enthält.
 */
export function mediaThumbnailChanged(event) {
    // Setze die neue Primärfarbe als Zielfarbe für den Übergang.
    targetColor = event.primaryColor;
}
