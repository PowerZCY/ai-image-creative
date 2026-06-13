export function installBigIntJsonSerialization() {
  if (typeof (BigInt.prototype as { toJSON?: () => string }).toJSON === 'function') {
    return;
  }

  (BigInt.prototype as { toJSON?: () => string }).toJSON = function toJSON() {
    return this.toString();
  };
}
