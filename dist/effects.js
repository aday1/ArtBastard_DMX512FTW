"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EffectsEngine {
    constructor(io) {
        this.io = io;
        this.effects = [];
        this.activeEffects = new Map();
        this.intervalId = null;
    }
    addEffect(effect) {
        this.effects.push(effect);
        this.io.emit('effectAdded', effect);
    }
    removeEffect(effectId) {
        const index = this.effects.findIndex(e => e.id === effectId);
        if (index !== -1) {
            this.effects.splice(index, 1);
            this.activeEffects.delete(effectId);
            this.io.emit('effectRemoved', effectId);
        }
    }
    applyEffect(effectId, target) {
        const effect = this.effects.find(e => e.id === effectId);
        if (effect) {
            if (!this.activeEffects.has(effectId)) {
                this.activeEffects.set(effectId, []);
            }
            this.activeEffects.get(effectId).push(target);
            this.io.emit('effectApplied', { effectId, target });
        }
    }
    removeEffectFromTarget(effectId, target) {
        const targets = this.activeEffects.get(effectId);
        if (targets) {
            const index = targets.findIndex(t => t.type === target.type && t.id === target.id);
            if (index !== -1) {
                targets.splice(index, 1);
                this.io.emit('effectRemovedFromTarget', { effectId, target });
            }
        }
    }
    startEffectsLoop() {
        if (this.intervalId === null) {
            this.intervalId = setInterval(() => this.processEffects(), 50); // Run every 50ms
        }
    }
    stopEffectsLoop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    processEffects() {
        const now = Date.now();
        for (const [effectId, targets] of this.activeEffects.entries()) {
            const effect = this.effects.find(e => e.id === effectId);
            if (effect) {
                for (const target of targets) {
                    this.applyEffectToTarget(effect, target, now);
                }
            }
        }
    }
    applyEffectToTarget(effect, target, now) {
        switch (effect.type) {
            case 'colorCycle':
                this.applyColorCycleEffect(effect, target, now);
                break;
            case 'strobe':
                this.applyStrobeEffect(effect, target, now);
                break;
        }
    }
    applyColorCycleEffect(effect, target, now) {
        const { speed, colors = ['#ff0000', '#00ff00', '#0000ff'] } = effect.params;
        const cycleTime = 1000 / speed; // Time for one complete cycle in ms
        const colorIndex = Math.floor((now % cycleTime) / (cycleTime / colors.length));
        const color = colors[colorIndex];
        // Emit an event to update the target's color
        this.io.emit('updateTargetColor', { target, color });
    }
    applyStrobeEffect(effect, target, now) {
        const { speed, intensity = 255 } = effect.params;
        const cycleTime = 1000 / speed; // Time for one complete cycle in ms
        const isOn = (now % cycleTime) < (cycleTime / 2);
        const value = isOn ? intensity : 0;
        // Emit an event to update the target's intensity
        this.io.emit('updateTargetIntensity', { target, value });
    }
}
exports.default = EffectsEngine;
