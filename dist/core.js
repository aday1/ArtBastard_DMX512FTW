"use strict";
/**
 * Core functionality module
 * This file directly implements or re-exports the core functions
 * to avoid circular dependency issues.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLaserTime = exports.updateArtNetConfig = exports.clearMidiMappings = exports.pingArtNetDevice = exports.saveScenes = exports.loadScenes = exports.saveScene = exports.loadScene = exports.updateDmxChannel = exports.addSocketHandlers = exports.disconnectMidiInput = exports.connectMidiInput = exports.initOsc = exports.saveConfig = exports.loadConfig = exports.learnMidiMapping = exports.simulateMidiInput = exports.listMidiInterfaces = void 0;
const index = __importStar(require("./index"));
const logger_1 = require("./logger");
// Re-exports
exports.listMidiInterfaces = index.listMidiInterfaces;
exports.simulateMidiInput = index.simulateMidiInput;
exports.learnMidiMapping = index.learnMidiMapping;
exports.loadConfig = index.loadConfig;
exports.saveConfig = index.saveConfig;
exports.initOsc = index.initOsc;
exports.connectMidiInput = index.connectMidiInput;
exports.disconnectMidiInput = index.disconnectMidiInput;
exports.addSocketHandlers = index.addSocketHandlers;
exports.updateDmxChannel = index.setDmxChannel; // Note the alias
exports.loadScene = index.loadScene;
exports.saveScene = index.saveScene;
exports.loadScenes = index.loadScenes;
exports.saveScenes = index.saveScenes;
exports.pingArtNetDevice = index.pingArtNetDevice;
exports.clearMidiMappings = index.clearMidiMappings;
exports.updateArtNetConfig = index.updateArtNetConfig;
// Direct implementation of startLaserTime to avoid circular references
function startLaserTime(io) {
    (0, logger_1.log)('Starting laser time sequence from core module');
    return index.startLaserTime(io);
}
exports.startLaserTime = startLaserTime;
