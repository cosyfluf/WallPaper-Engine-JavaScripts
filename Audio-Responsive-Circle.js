'use strict';
// Audio Visualizer Circle - Wallpaper Engine Script
export let __workshopId = '2398102478';

import * as WEVector from 'WEVector';

export var scriptProperties = createScriptProperties()
	.addSlider({
		name: 'barCount',
		label: 'Bar Count',
		value: 64,
		min: 16,
		max: 256,
		integer: true
	})
	.addSlider({
		name: 'barWidth',
		label: 'Bar Width (Scale)',
		value: 8,
		min: 0.1,
		max: 15,
		integer: false
	})
	.addSlider({
		name: 'scaleY',
		label: 'Bar Height (Scale Y)',
		value: 80,
		min: 10,
		max: 200,
		integer: true
	})
	.addSlider({
		name: 'circleRadius',
		label: 'Circle Radius',
		value: 400,
		min: 100,
		max: 800,
		integer: true
	})
	.addSlider({
		name: 'arc',
		label: 'Arc (Degrees)',
		value: 360,
		min: 0,
		max: 360,
		integer: false
	})
	.addSlider({
		name: 'rotationOffset',
		label: 'Rotation Offset',
		value: 0,
		min: 0,
		max: 360,
		integer: false
	})
	.addCombo({
		name: 'barAlignment',
		label: 'Bar Alignment (Direction)',
		value: 'top',
		options: [{
			label: 'Outward',
			value: 'top'
		}, {
			label: 'Inward',
			value: 'bottom'
		}, {
			label: 'Centre',
			value: 'centre'
		}]
	})
	.addCheckbox({
		name: 'enableRainbow',
		label: 'Enable Rainbow Colors',
		value: true
	})
	.addSlider({
		name: 'saturation',
		label: 'Color Saturation',
		value: 1.0,
		min: 0,
		max: 1,
		integer: false
	})
	.addSlider({
		name: 'brightness',
		label: 'Color Brightness',
		value: 0.5,
		min: 0.1,
		max: 1,
		integer: false
	})
	.finish();

var bars = [];
let audioData = engine.registerAudioBuffers(64);

/**
 * HSL to RGB conversion
 */
function hslToRgb(h, s, l) {
	let r, g, b;

	if (s === 0) {
		r = g = b = l;
	} else {
		const hue2rgb = (p, q, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return new Vec4(r, g, b, 1.0);
}

/**
 * Initialize bars in a full circle (360 degrees)
 * Audio frequency mapping: Each half shows full spectrum (left side mirrored)
 */
export function init() {
	let center = thisLayer.origin;
	let barCount = scriptProperties.barCount;
	let totalBars = (barCount * 2) + 1; // Left + Right + 1 center bar

	bars.push(thisLayer);
	let thisIndex = thisScene.getLayerIndex(thisLayer);

	// Create additional bars (barCount for left, barCount for right, +1 for center)
	for (var i = 1; i < totalBars; ++i) {
		let bar = thisScene.createLayer('models/bar.json');
		bar.alignment = scriptProperties.barAlignment;
		thisScene.sortLayer(bar, thisIndex);
		bar.parallaxDepth = new Vec2(0, 0);
		bars.push(bar);
	}

	// Position bars based on arc setting
	for (i = 0; i < totalBars; ++i) {
		// Calculate angle based on arc setting
		let angle = (scriptProperties.arc * (i / (totalBars - 1))) + scriptProperties.rotationOffset;
		let direction = new Vec3(WEVector.angleVector2(angle)).multiply(scriptProperties.circleRadius);
		let bar = bars[i];
		
		bar.origin = center.add(direction);
		bar.angles = new Vec3(0, 0, angle + 90);

		// Apply rainbow colors
		if (scriptProperties.enableRainbow) {
			let hue = i / (totalBars - 1);
			bar.color = hslToRgb(hue, scriptProperties.saturation, scriptProperties.brightness);
		}
	}
}

/**
 * Update bars based on audio data
 * Left half (0° to 180°) = Full spectrum MIRRORED (63 to 0)
 * Right half (180° to 360°) = Full spectrum normal (0 to 63)
 * Center bar at top
 */
export function update() {
	var scale = new Vec3(scriptProperties.barWidth);
	let barCount = scriptProperties.barCount;
	let totalBars = (barCount * 2) + 1; // Left + Right + center

	for (var i = 0; i < totalBars; ++i) {
		let audioIndex;
		
		if (i <= barCount) {
			// Left half + center: MIRRORED - Map to spectrum 63-0 (reversed)
			let progress = i / barCount;
			audioIndex = Math.floor(63 - progress * 63);
		} else {
			// Right half: NORMAL - Map to spectrum 0-63
			let progress = (i - barCount) / barCount;
			audioIndex = Math.floor(progress * 63);
		}

		// Clamp audioIndex to valid range
		audioIndex = Math.min(63, Math.max(0, audioIndex));

		let amt = audioData.average[audioIndex];
		let bar = bars[i];

		if (bar) {
			scale.y = amt * scriptProperties.scaleY;
			bar.alignment = scriptProperties.barAlignment;
			bar.scale = scale;
		}
	}
}

/**
 * Apply user property changes
 */
export function applyUserProperties(changedProperties) {
	let barCount = scriptProperties.barCount;
	let totalBars = (barCount * 2) + 1;

	if (changedProperties.hasOwnProperty('barCount')) {
		// Rebuild all bars if bar count changes
		// Clear existing bars
		for (let i = 1; i < bars.length; ++i) {
			if (bars[i]) {
				bars[i].visible = false;
			}
		}
		bars = [thisLayer];
		
		// Reinitialize with new bar count
		init();
		return;
	}

	if (changedProperties.hasOwnProperty('circleRadius') || 
		changedProperties.hasOwnProperty('rotationOffset') ||
		changedProperties.hasOwnProperty('arc')) {
		// Reinitialize positions if circle properties change
		let center = bars[0] ? thisLayer.origin : new Vec3(0, 0, 0);
		
		for (var i = 0; i < totalBars; ++i) {
			let angle = (scriptProperties.arc * (i / (totalBars - 1))) + scriptProperties.rotationOffset;
			let direction = new Vec3(WEVector.angleVector2(angle)).multiply(scriptProperties.circleRadius);
			let bar = bars[i];
			
			if (bar) {
				bar.origin = center.add(direction);
				bar.angles = new Vec3(0, 0, angle + 90);
			}
		}
	}

	if (changedProperties.hasOwnProperty('enableRainbow') || 
		changedProperties.hasOwnProperty('saturation') || 
		changedProperties.hasOwnProperty('brightness')) {
		// Update colors
		for (var i = 0; i < totalBars; ++i) {
			if (scriptProperties.enableRainbow && bars[i]) {
				let hue = i / (totalBars - 1);
				bars[i].color = hslToRgb(hue, scriptProperties.saturation, scriptProperties.brightness);
			}
		}
	}
}
