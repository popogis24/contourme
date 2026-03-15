function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function multiHash(str, count) {
  const hashes = [];
  for (let i = 0; i < count; i++) {
    hashes.push(fnv1a(str + '\x00' + i));
  }
  return hashes;
}

export function hashInputs(name, date, time) {
  return fnv1a(name.trim().toLowerCase() + '|' + date + '|' + time);
}

export function deriveParams(name, date, time) {
  const key = name.trim().toLowerCase() + '|' + date + '|' + time;
  const hashes = multiHash(key, 8);
  const norm = (h) => h / 0xFFFFFFFF;

  return {
    density:       norm(hashes[0]),
    complexity:    norm(hashes[1]),
    focusX:        norm(hashes[2]),
    focusY:        norm(hashes[3]),
    focusStrength: norm(hashes[4]),
    angle:         norm(hashes[5]),
    scale:         norm(hashes[6]),
    lineWeight:    norm(hashes[7]),
  };
}
