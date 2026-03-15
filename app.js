import { hashInputs, deriveParams } from './hash.js';
import { generateField, extractContours, renderContours } from './contour.js';

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

function generate(name, date, time, resolution, bgColor, lineColor) {
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

  const segments = extractContours(field, fieldW, fieldH, thresholds);
  const ctx = previewCanvas.getContext('2d');
  renderContours(ctx, segments, fieldW, fieldH, previewW, previewH, params.lineWeight, bgColor, lineColor);

  previewContainer.classList.add('visible');
}

function downloadFullRes() {
  if (!currentParams) return;

  const { w, h } = currentResolution;

  const field = generateField(w, h, currentParams, currentSeed);

  const numLines = Math.floor(10 + currentParams.density * 40);
  const { min, max } = fieldMinMax(field);
  const thresholds = [];
  for (let i = 1; i <= numLines; i++) {
    thresholds.push(min + (max - min) * (i / (numLines + 1)));
  }

  const segments = extractContours(field, w, h, thresholds);

  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d');
  renderContours(ctx, segments, w, h, w, h, currentParams.lineWeight, currentBgColor, currentLineColor);

  const link = document.createElement('a');
  link.download = `contour-${currentFirstName}.png`;
  link.href = offscreen.toDataURL('image/png');
  link.click();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const date = document.getElementById('birthdate').value;
  const time = document.getElementById('birthtime').value;
  const resolution = document.getElementById('resolution').value;
  const bgColor = document.getElementById('bg-color').value;
  const lineColor = document.getElementById('line-color').value;

  if (name.trim().length < 2) return;

  generateBtn.disabled = true;
  generateBtn.textContent = 'Gerando...';

  requestAnimationFrame(() => {
    setTimeout(() => {
      generate(name, date, time, resolution, bgColor, lineColor);
      generateBtn.disabled = false;
      generateBtn.textContent = 'Gerar';
    }, 16);
  });
});

downloadBtn.addEventListener('click', () => {
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'Gerando alta resolucao...';

  requestAnimationFrame(() => {
    setTimeout(() => {
      downloadFullRes();
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Baixar PNG';
    }, 16);
  });
});
