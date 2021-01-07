export function roundToHalf(float: number) {
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
