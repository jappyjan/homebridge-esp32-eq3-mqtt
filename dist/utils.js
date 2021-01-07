"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundToHalf = void 0;
function roundToHalf(float) {
    let decimal = (float - parseInt(float.toString(), 10));
    decimal = Math.round(decimal * 10);
    if (decimal === 5) {
        return (parseInt(float.toString(), 10) + 0.5);
    }
    if ((decimal < 3) || (decimal > 7)) {
        return Math.round(float);
    }
    return (parseInt(float.toString(), 10) + 0.5);
}
exports.roundToHalf = roundToHalf;
//# sourceMappingURL=utils.js.map