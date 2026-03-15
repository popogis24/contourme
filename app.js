import { hashInputs, deriveParams } from './hash.js';
import { generateField, extractContours, renderContours, renderContoursProgressive } from './contour.js';

const form = document.getElementById('form');
const generateBtn = document.getElementById('generate-btn');
const previewContainer = document.getElementById('preview-container');
const previewCanvas = document.getElementById('preview');
const downloadBtn = document.getElementById('download-btn');

let currentParams = null;
let currentSeed = 0;
let currentResolution = { w: 1920, h: 1080 };
let currentFirstName = '';
let currentBgColor = '#0a0a0a';
let currentLineColor = '#ffffff';

// Input masks for date (dd/mm/aaaa) and time (hh:mm)
function maskDate(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 4) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4);
    else if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    input.value = v;
  });
}

function maskTime(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + ':' + v.slice(2);
    input.value = v;
  });
}

maskDate(document.getElementById('birthdate'));
maskTime(document.getElementById('birthtime'));

function parseResolution(value) {
  const [w, h] = value.split('x').map(Number);
  return { w, h };
}

function fieldMinMax(field) {
  let min = field[0];
  let max = field[0];
  for (let i = 1; i < field.length; i++) {
    if (field[i] < min) min = field[i];
    if (field[i] > max) max = field[i];
  }
  return { min, max };
}

async function generate(name, date, time, resolution, bgColor, lineColor) {
  const seed = hashInputs(name, date, time);
  const params = deriveParams(name, date, time);
  const { w, h } = parseResolution(resolution);

  currentParams = params;
  currentSeed = seed;
  currentResolution = { w, h };
  currentFirstName = name.trim().split(/\s+/)[0].toLowerCase();
  currentBgColor = bgColor;
  currentLineColor = lineColor;

  const maxPreviewWidth = Math.min(960, window.innerWidth - 32);
  const aspect = h / w;
  const previewW = maxPreviewWidth;
  const previewH = Math.round(maxPreviewWidth * aspect);

  previewCanvas.width = previewW;
  previewCanvas.height = previewH;

  const fieldW = Math.min(w, 600);
  const fieldH = Math.round(fieldW * aspect);

  const field = generateField(fieldW, fieldH, params, seed);

  const numLines = Math.floor(10 + params.density * 40);
  const { min, max } = fieldMinMax(field);
  const thresholds = [];
  for (let i = 1; i <= numLines; i++) {
    thresholds.push(min + (max - min) * (i / (numLines + 1)));
  }

  previewContainer.classList.add('visible');

  const ctx = previewCanvas.getContext('2d');
  await renderContoursProgressive(ctx, field, fieldW, fieldH, previewW, previewH, thresholds, params.lineWeight, bgColor, lineColor);

  document.getElementById('donate-overlay').classList.add('visible');
}

function downloadFullRes() {
  if (!currentParams) return;

  const { w, h } = currentResolution;
  const aspect = h / w;

  // Use a moderate field grid (same as preview) — contours scale perfectly
  const fieldW = Math.min(w, 600);
  const fieldH = Math.round(fieldW * aspect);

  const field = generateField(fieldW, fieldH, currentParams, currentSeed);

  const numLines = Math.floor(10 + currentParams.density * 40);
  const { min, max } = fieldMinMax(field);
  const thresholds = [];
  for (let i = 1; i <= numLines; i++) {
    thresholds.push(min + (max - min) * (i / (numLines + 1)));
  }

  const segments = extractContours(field, fieldW, fieldH, thresholds);

  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d');
  renderContours(ctx, segments, fieldW, fieldH, w, h, currentParams.lineWeight, currentBgColor, currentLineColor);

  const link = document.createElement('a');
  link.download = `contour-${currentFirstName}.png`;
  link.href = offscreen.toDataURL('image/png');
  link.click();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const date = document.getElementById('birthdate').value;
  const time = document.getElementById('birthtime').value;
  const resolution = document.getElementById('resolution').value;
  const bgColor = document.getElementById('bg-color').value;
  const lineColor = document.getElementById('line-color').value;

  if (name.trim().length < 2) return;

  generateBtn.disabled = true;
  generateBtn.textContent = 'revelando...';

  // Let UI update before heavy computation
  await new Promise(r => setTimeout(r, 16));
  await generate(name, date, time, resolution, bgColor, lineColor);
  generateBtn.disabled = false;
  generateBtn.textContent = 'revelar';
});

downloadBtn.addEventListener('click', () => {
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'preparando...';

  requestAnimationFrame(() => {
    setTimeout(() => {
      downloadFullRes();
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'baixar';
    }, 16);
  });
});

// Donate
const donateBtn = document.getElementById('donate-btn');
const donateMsg = document.getElementById('donate-msg');
const donateValue = document.getElementById('donate-value');

const donateOverlay = document.getElementById('donate-overlay');
const donateClose = document.getElementById('donate-close');

donateClose.addEventListener('click', () => {
  donateOverlay.classList.remove('visible');
});

donateOverlay.addEventListener('click', (e) => {
  if (e.target === donateOverlay) donateOverlay.classList.remove('visible');
});

donateBtn.addEventListener('click', () => {
  const val = Number(donateValue.value);
  if (val < 30000) {
    donateMsg.textContent = 'valor minimo e R$ 30.000,00. eu sei do meu valor.';
  } else {
    donateMsg.textContent = 'obrigado pela intencao. infelizmente ainda nao implementei o pagamento.';
  }
});
