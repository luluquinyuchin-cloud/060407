// ⚡ 電流急急棒 - p5.js sketch.js
// 使用方式：搭配 index.html 載入 p5.js 執行

const LEVELS = [
  {
    name: "新手訓練",
    color: "#22c55e",
    wire: 28,
    desc: "適合第一次接觸的基礎練習",
    pts: [{x:60,y:210},{x:190,y:160},{x:330,y:250},{x:480,y:150},{x:620,y:210},{x:700,y:210}]
  },
  {
    name: "初級挑戰",
    color: "#3b82f6",
    wire: 20,
    desc: "加入了一些轉折，穩定是關鍵",
    pts: [{x:60,y:210},{x:160,y:130},{x:290,y:280},{x:430,y:120},{x:560,y:290},{x:660,y:180},{x:700,y:180}]
  },
  {
    name: "中級關卡",
    color: "#f59e0b",
    wire: 15,
    desc: "波浪起伏變大，考驗協調性",
    pts: [{x:60,y:210},{x:140,y:110},{x:240,y:300},{x:360,y:100},{x:470,y:310},{x:580,y:130},{x:660,y:260},{x:700,y:210}]
  },
  {
    name: "高級挑戰",
    color: "#ef4444",
    wire: 11,
    desc: "窄小的通道，需要精確的操作",
    pts: [{x:60,y:210},{x:130,y:90},{x:220,y:320},{x:310,y:80},{x:420,y:330},{x:510,y:90},{x:600,y:300},{x:660,y:120},{x:700,y:210}]
  },
  {
    name: "極限大師",
    color: "#9333ea",
    wire: 8,
    desc: "這不是一般人能通過的寬度",
    pts: [{x:60,y:210},{x:120,y:80},{x:200,y:340},{x:295,y:70},{x:390,y:340},{x:480,y:80},{x:565,y:330},{x:640,y:100},{x:700,y:210}]
  },
  {
    name: "迷蹤電網",
    color: "#00f2ff",
    wire: 14,
    desc: "時機就是一切！在複雜迷宮中穿梭",
    pts: [
      {x:60, y:210}, {x:130, y:210}, 
      {x:130, y:350}, {x:280, y:350}, // 第一區：底部繞行
      {x:280, y:60},  {x:450, y:60},  // 第二區：頂部爬升
      {x:450, y:200}, {x:350, y:200}, // 第三區：中間回頭路
      {x:350, y:320}, {x:600, y:320}, // 第四區：長距離橫移
      {x:600, y:180}, {x:520, y:180}, // 第五區：局部回轉
      {x:520, y:100}, {x:680, y:100}, // 第六區：右上突圍
      {x:680, y:210}, {x:700, y:210}  // 終點
    ],
    obstacles: [
      // 障礙物 1: 垂直閘門，攔截 y=350 的橫線
      { x: 200, y: 320, w: 20, h: 60, vx: 0, vy: 3, minY: 280, maxY: 400 },
      // 障礙物 2: 水平閘門，攔截 x=450 的縱線
      { x: 420, y: 120, w: 60, h: 20, vx: 4, vy: 0, minX: 380, maxX: 520 },
      // 障礙物 3: 快速垂直閘門，攔截 y=320 的長橫線
      { x: 480, y: 300, w: 20, h: 60, vx: 0, vy: -5, minY: 250, maxY: 380 }
    ]
  }
];

// Game state
let state = 'home'; // home | levelSelect | playing | fail | success
let currentLevel = 0;
let gameActive = false;
let sparkParticles = [];
let failTimer = 0;
let successTimer = 0;
let animT = 0;
let pulseT = 0;
let hoverBtn = -1;
let mx = 0, my = 0; // 遊戲相對座標
let scaleF = 1;     // 縮放比例
let offsetX = 0, offsetY = 0; // 偏移量
let cursorHistory = []; // 紀錄游標歷史位置

function updateGameMouse() {
  scaleF = min(width / 760, height / 420);
  offsetX = (width - 760 * scaleF) / 2;
  offsetY = (height - 420 * scaleF) / 2;
  mx = (mouseX - offsetX) / scaleF;
  my = (mouseY - offsetY) / scaleF;
}

// ─── p5.js lifecycle ───────────────────────────────────────────────────────────

function setup() {
  createCanvas(windowWidth, windowHeight);
  noCursor(); // 全域隱藏系統游標
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  updateGameMouse();
  updateParticles();
  checkGameLogic();

  drawBackground(); // 先繪製填滿全螢幕的背景

  push();
  translate(offsetX, offsetY); // 移動到置中位置
  scale(scaleF);               // 執行全域縮放
  switch (state) {
    case 'home':        drawHomeScreen();      break;
    case 'levelSelect': drawLevelSelect();     break;
    case 'playing':     drawGameScreen();      break;
    case 'fail':        drawFailScreen();      break;
    case 'success':     drawSuccessScreen();   break;
  }

  drawCustomCursor(mx, my); // 在縮放畫布內繪製自定義游標
  pop();

  updateHover();
}

// ─── Mouse events ──────────────────────────────────────────────────────────────

function mouseMoved() {
  updateGameMouse();
  // Auto-start when ring reaches START point
  if (state === 'playing' && !gameActive) {
    const startPt = LEVELS[currentLevel].pts[0];
    if (dist(mx, my, startPt.x, startPt.y) < 22) {
      gameActive = true;
    }
  }
}

function mousePressed() {
  updateGameMouse();
  handleClick(mx, my);
}

function mouseExited() {
  if (state === 'playing' && gameActive) {
    triggerFail();
  }
}

function mouseDragged() {
  mouseMoved();
}

// ─── Click handler ─────────────────────────────────────────────────────────────

function handleClick(cx, cy) {
  if (state === 'home') {
    if (cx >= 280 && cx <= 480 && cy >= 255 && cy <= 307) {
      state = 'levelSelect';
    }

  } else if (state === 'levelSelect') {
    // Level cards
    const cols = 3, cardW = 200, cardH = 100, gapX = 25, gapY = 20;
    const startXc = (760 - (cols * cardW + (cols - 1) * gapX)) / 2;
    const startYc = 75;
    for (let i = 0; i < LEVELS.length; i++) {
      const col = i % cols;
      const row = floor(i / cols);
      const lx = startXc + col * (cardW + gapX);
      const ly = startYc + row * (cardH + gapY);
      if (cx >= lx && cx <= lx + cardW && cy >= ly && cy <= ly + cardH) {
        currentLevel = i;
        startGame();
        return;
      }
    }
    // Back button
    if (cx >= 310 && cx <= 450 && cy >= 360 && cy <= 400) {
      state = 'home';
    }

  } else if (state === 'fail') {
    if (failTimer > 30) {
      if (cx >= 220 && cx <= 350 && cy >= 270 && cy <= 316) {
        startGame(); // retry
      }
      if (cx >= 400 && cx <= 540 && cy >= 270 && cy <= 316) {
        state = 'levelSelect';
      }
    }

  } else if (state === 'success') {
    if (successTimer > 30) {
      const isLast = currentLevel === LEVELS.length - 1;
      // Next level
      if (!isLast && cx >= 200 && cx <= 360 && cy >= 255 && cy <= 301) {
        currentLevel++;
        startGame();
      }
      // Level select
      const b4x = isLast ? 380 : 480;
      const b4y = isLast ? 320 : 278;
      if (cx >= b4x - 80 && cx <= b4x + 80 && cy >= b4y - 23 && cy <= b4y + 23) {
        state = 'levelSelect';
      }
    }
  }
}

// ─── Game helpers ──────────────────────────────────────────────────────────────

function startGame() {
  state = 'playing';
  gameActive = false;
  sparkParticles = [];
}

function triggerFail() {
  spawnSparks(mx, my);
  state = 'fail';
  gameActive = false;
  failTimer = 0;
}

function checkGameLogic() {
  if (state !== 'playing' || !gameActive) return;
  const level = LEVELS[currentLevel];
  const d = distToPath(mx, my, level);
  const ringSize = 14;
  const pts = level.pts;
  const endPt = pts[pts.length - 1];

  // Collision with wire boundary
  if (d > level.wire + ringSize - 2) {
    triggerFail();
    return;
  }

  // Collision with moving obstacles
  if (level.obstacles) {
    for (let ob of level.obstacles) {
      // 考慮電圈半徑 14px 的碰撞判定
      if (mx > ob.x - 14 && mx < ob.x + ob.w + 14 &&
          my > ob.y - 14 && my < ob.y + ob.h + 14) {
        triggerFail();
        return;
      }
    }
  }

  // Reached END point
  if (dist(mx, my, endPt.x, endPt.y) < 18) {
    state = 'success';
    gameActive = false;
    successTimer = 0;
  }
}

function updateHover() {
  hoverBtn = -1;

  if (state === 'home') {
    if (mx >= 280 && mx <= 480 && my >= 255 && my <= 307) hoverBtn = 0;

  } else if (state === 'levelSelect') {
    const cols = 3, cardW = 200, cardH = 100, gapX = 25, gapY = 20;
    const startXc = (760 - (cols * cardW + (cols - 1) * gapX)) / 2;
    const startYc = 75;
    for (let i = 0; i < LEVELS.length; i++) {
      const col = i % cols, row = floor(i / cols);
      const cx = startXc + col * (cardW + gapX);
      const cy = startYc + row * (cardH + gapY);
      if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) hoverBtn = i + 10;
    }
    if (mx >= 310 && mx <= 450 && my >= 360 && my <= 400) hoverBtn = 99;

  } else if (state === 'fail') {
    if (mx >= 220 && mx <= 350 && my >= 270 && my <= 316) hoverBtn = 1;
    if (mx >= 400 && mx <= 540 && my >= 270 && my <= 316) hoverBtn = 2;

  } else if (state === 'success') {
    const isLast = currentLevel === LEVELS.length - 1;
    if (!isLast && mx >= 200 && mx <= 360 && my >= 255 && my <= 301) hoverBtn = 3;
    
    const b4x = isLast ? 380 : 480;
    const b4y = isLast ? 320 : 278;
    if (mx >= b4x - 80 && mx <= b4x + 80 && my >= b4y - 23 && my <= b4y + 23) hoverBtn = 4;
  }
}

// ─── Particle system ───────────────────────────────────────────────────────────

function spawnSparks(x, y) {
  const colors = ['#ffd700', '#ff6b35', '#ffff00', '#ffffff'];
  for (let i = 0; i < 18; i++) {
    const a = random(TWO_PI);
    const s = random(2, 7);
    sparkParticles.push({
      x, y,
      vx: cos(a) * s,
      vy: sin(a) * s,
      life: 1.0,
      color: random(colors)
    });
  }
}

function updateParticles() {
  for (let p of sparkParticles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= 0.035;
  }
  sparkParticles = sparkParticles.filter(p => p.life > 0);
}

function drawParticles() {
  noStroke();
  for (let p of sparkParticles) {
    const c = color(p.color);
    c.setAlpha(p.life * 255);
    fill(c);
    circle(p.x, p.y, 6 * p.life);
  }
}

// ─── Distance utilities ────────────────────────────────────────────────────────

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = constrain(t, 0, 1);
  return dist(px, py, ax + t * dx, ay + t * dy);
}

function distToPath(x, y, level) {
  const pts = level.pts;
  let minD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSegment(x, y, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
    if (d < minD) minD = d;
  }
  return minD;
}

// ─── Background ────────────────────────────────────────────────────────────────

function drawBackground() {
  // Dark gradient background
  for (let y = 0; y < height; y++) {
    const inter = map(y, 0, height, 0, 1);
    const c = lerpColor(color('#0f172a'), color('#1e1b4b'), inter);
    stroke(c);
    line(0, y, width, y);
  }
  // Grid
  stroke(99, 102, 241, 18);
  strokeWeight(1);
  for (let x = 0; x < width; x += 40) line(x, 0, x, height);
  for (let y = 0; y < height; y += 40) line(0, y, width, y);
  noStroke();
}

// ─── HOME SCREEN ───────────────────────────────────────────────────────────────

function drawHomeScreen() {
  animT += 0.02;

  // Title
  textAlign(CENTER, CENTER);
  textSize(58);
  textStyle(BOLD);
  
  // 霓虹重疊特效
  const flicker = noise(frameCount * 0.1) > 0.1 ? 1 : 0.5;
  const offset = sin(frameCount * 0.1) * 2;
  
  fill(239, 68, 68, 100 * flicker); // 紅色偏影
  text('⚡ 電流急急棒', 380 + offset, 165);
  fill(59, 130, 246, 100 * flicker); // 藍色偏影
  text('⚡ 電流急急棒', 380 - offset, 165);
  fill(255, 255, 255, 230 * flicker);
  text('⚡ 電流急急棒', 380, 165);
  
  textSize(16);
  textStyle(NORMAL);
  fill(148, 163, 184, 230);
  text('引導電圈穿越導線，挑戰你的手眼協調！', 380, 205);

  // Start button
  const isHov = hoverBtn === 0;
  const s = isHov ? 1.05 : 1.0; // 縮放效果
  
  push();
  translate(380, 281);
  scale(s);
  
  // 按鈕呼吸燈底色
  const btnAlpha = 180 + sin(frameCount * 0.1) * 30;
  fill(isHov ? color(124, 58, 237, btnAlpha) : color(109, 40, 217, 200));
  rect(-100, -26, 200, 52, 12);

  // 按鈕邊框與光條
  stroke(isHov ? '#a78bfa' : '#4c1d95');
  strokeWeight(2);
  noFill();
  rect(-100, -26, 200, 52, 12);
  
  if (isHov) {
    push();
    // 使用 Canvas 原生遮罩功能，確保流光不會超出圓角邊框
    drawingContext.beginPath();
    drawingContext.roundRect(-100, -26, 200, 52, 12);
    drawingContext.clip();

    // 內部流光特效
    let lineX = -130 + (frameCount * 8) % 260; // 稍微擴大掃描範圍確保進出流暢
    stroke(255, 255, 255, 120);
    strokeWeight(4);
    line(lineX, -30, lineX + 30, 30);
    pop();
  }
  
  noStroke();
  fill(255);
  textSize(20);
  textStyle(BOLD);
  text('開始遊戲', 0, 0);
  pop();

  // Subtitle
  textSize(13);
  textStyle(NORMAL);
  fill(148, 163, 184, 150);
  text('共 6 個關卡 · 挑戰幾何極限', 380, 340);
}

// ─── LEVEL SELECT ──────────────────────────────────────────────────────────────

function drawLevelSelect() {

  textAlign(CENTER, CENTER);
  textSize(28);
  textStyle(BOLD);
  fill('#e2e8f0');
  noStroke();
  text('選擇關卡', 380, 50);

  const cols = 3, cardW = 200, cardH = 100, gapX = 25, gapY = 20;
  const startXc = (760 - (cols * cardW + (cols - 1) * gapX)) / 2;
  const startYc = 75;

  for (let i = 0; i < LEVELS.length; i++) {
    const lv = LEVELS[i];
    const col = i % cols;
    const row = floor(i / cols);
    const cx = startXc + col * (cardW + gapX);
    const cy = startYc + row * (cardH + gapY);
    const isHov = hoverBtn === i + 10;
    const s = isHov ? 1.03 : 1.0;

    push();
    translate(cx + cardW/2, cy + cardH/2);
    scale(s);
    
    // Card background (centered)
    fill(isHov ? color(99, 102, 241, 64) : color(30, 27, 75, 200));
    stroke(isHov ? lv.color : color(99, 102, 241, 76));
    strokeWeight(isHov ? 2 : 1);
    rect(-cardW/2, -cardH/2, cardW, cardH, 10);
    noStroke();

    // Level number
    textAlign(LEFT, TOP);
    textSize(14);
    textStyle(BOLD);
    fill(lv.color);
    text(`第 ${i + 1} 關`, -cardW/2 + 14, -cardH/2 + 14);

    // Level name
    textSize(16);
    fill('#f1f5f9');
    text(lv.name, -cardW/2 + 14, -cardH/2 + 36);

    // Description
    textSize(12);
    textStyle(NORMAL);
    fill(148, 163, 184, 200);
    text(lv.desc, -cardW/2 + 14, -cardH/2 + 58);

    // Wire width info
    textSize(11);
    fill(148, 163, 184, 120);
    text(`通道寬度: ${lv.wire * 2}px`, -cardW/2 + 14, -cardH/2 + 76);
    pop();
  }

  // Back button
  const isBackHov = hoverBtn === 99;
  fill(isBackHov ? color(99, 102, 241, 76) : color(30, 27, 75, 200));
  stroke(color(99, 102, 241, 100));
  strokeWeight(1);
  rect(310, 360, 140, 40, 8);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(15);
  textStyle(NORMAL);
  fill(148, 163, 184);
  text('← 返回首頁', 380, 380);
}

// ─── GAME SCREEN ───────────────────────────────────────────────────────────────

function drawGameScreen() {
  pulseT += 0.05;

  const level = LEVELS[currentLevel];
  const pts = level.pts;
  const w = level.wire;

  // HUD
  textAlign(LEFT, TOP);
  textSize(14);
  textStyle(BOLD);
  fill(148, 163, 184);
  noStroke();
  text(`第 ${currentLevel + 1} 關 — ${level.name}`, 20, 12);

  textAlign(RIGHT, TOP);
  textSize(13);
  textStyle(NORMAL);
  fill(148, 163, 184, 120);
  text(gameActive ? '⚡ 進行中' : '將滑鼠移至左側起點開始', 740, 12);

  // Moving Obstacles logic and drawing
  if (level.obstacles) {
    for (let ob of level.obstacles) {
      if (gameActive) {
        if (ob.vx !== 0) {
          ob.x += ob.vx;
          if (ob.x < ob.minX || ob.x > ob.maxX) ob.vx *= -1;
        }
        if (ob.vy !== 0) {
          ob.y += ob.vy;
          if (ob.y < ob.minY || ob.y > ob.maxY) ob.vy *= -1;
        }
      }
      // Draw obstacle
      drawGlow(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w, '#ef4444', 0.4);
      fill('#f87171');
      stroke('#ef4444');
      strokeWeight(2);
      rect(ob.x, ob.y, ob.w, ob.h, 4);
    }
  }

  // Wire tolerance zone (shadow)
  strokeWeight(w * 2);
  stroke(99, 102, 241, 38);
  noFill();
  beginShape();
  for (let i = 0; i < pts.length; i++) vertex(pts[i].x, pts[i].y);
  endShape();

  // Wire (main line) — using vertex to connect all points
  strokeWeight(3);
  noFill();
  beginShape();
  for (let i = 0; i < pts.length; i++) {
    // Color shifts left→right via lerp
    const t = i / (pts.length - 1);
    stroke(
      lerp(0x4a, 0xa7, t),   // R
      lerp(0xde, 0x8b, t),   // G
      lerp(0x80, 0xfa, t)    // B
    );
    vertex(pts[i].x, pts[i].y);
  }
  endShape();

  // START point
  const sp = pts[0];
  drawGlow(sp.x, sp.y, 18, '#4ade80', 0.6);
  fill('#4ade80');
  noStroke();
  circle(sp.x, sp.y, 14);
  textAlign(CENTER, TOP);
  textSize(11);
  textStyle(BOLD);
  fill('#4ade80');
  text('START', sp.x, sp.y + 14);

  // END point (pulsing)
  const ep = pts[pts.length - 1];
  const pulse = 18 + sin(pulseT) * 4;
  drawGlow(ep.x, ep.y, pulse, '#a78bfa', 0.6);
  fill('#a78bfa');
  noStroke();
  circle(ep.x, ep.y, 14);
  fill('#a78bfa');
  text('END', ep.x, ep.y + 14);

  // Ring (cursor)
  const d = distToPath(mx, my, level);
  let ringCol;
  if (d < w - 2)      ringCol = color('#34d399');
  else if (d < w + 2) ringCol = color('#fbbf24');
  else                ringCol = color('#ef4444');

  noFill();
  stroke(ringCol);
  strokeWeight(3);
  circle(mx, my, 28); // radius 14

  fill(ringCol);
  noStroke();
  circle(mx, my, 6);

  drawParticles();
}

// ─── FAIL SCREEN ───────────────────────────────────────────────────────────────

function drawFailScreen() {
  drawGameScreen();
  failTimer++;

  fill(0, 0, 0, 178);
  noStroke();
  rect(0, 0, 760, 420);

  const alpha = constrain(failTimer / 20, 0, 1) * 255;
  textAlign(CENTER, CENTER);
  textSize(56);
  textStyle(BOLD);
  fill(239, 68, 68, alpha);
  text('⚡ 觸電！', 380, 175);

  textSize(20);
  textStyle(NORMAL);
  fill(148, 163, 184, alpha);
  text('電圈碰到導線了！', 380, 218);

  if (failTimer > 30) {
    // Retry button
    const isHov1 = hoverBtn === 1;
    push();
    translate(285, 293);
    scale(isHov1 ? 1.05 : 1.0);
    fill(isHov1 ? '#dc2626' : '#991b1b');
    noStroke();
    rect(-65, -23, 130, 46, 10);
    textSize(16);
    textStyle(BOLD);
    fill(255);
    text('再試一次', 0, 0);
    pop();

    // Level select button
    const isHov2 = hoverBtn === 2;
    push();
    translate(470, 293);
    scale(isHov2 ? 1.05 : 1.0);
    fill(isHov2 ? '#4338ca' : '#312e81');
    rect(-70, -23, 140, 46, 10);
    fill(255);
    text('選擇關卡', 0, 0);
    pop();
  }
}

// ─── SUCCESS SCREEN ────────────────────────────────────────────────────────────

function drawSuccessScreen() {
  drawGameScreen();
  successTimer++;

  fill(0, 0, 0, 165);
  noStroke();
  rect(0, 0, 760, 420);

  const alpha = constrain(successTimer / 20, 0, 1) * 255;

  textAlign(CENTER, CENTER);
  textSize(56);
  textStyle(BOLD);
  fill(52, 211, 153, alpha);
  text('🎉 闖關成功！', 380, 165);

  textSize(20);
  textStyle(NORMAL);
  fill(148, 163, 184, alpha);
  text(`第 ${currentLevel + 1} 關「${LEVELS[currentLevel].name}」完成！`, 380, 208);

  if (successTimer > 30) {
    if (currentLevel < LEVELS.length - 1) {
      const isHov3 = hoverBtn === 3;
      push();
      translate(280, 278);
      scale(isHov3 ? 1.05 : 1.0);
      fill(isHov3 ? '#059669' : '#065f46');
      noStroke();
      rect(-80, -23, 160, 46, 10);
      textSize(16);
      textStyle(BOLD);
      fill(255);
      text('下一關 →', 0, 0);
      pop();
    } else {
      textSize(20);
      textStyle(BOLD);
      fill(252, 211, 77, alpha);
      text('🏆 恭喜！你完成了所有關卡！', 380, 265);
    }

    const isLast = currentLevel === LEVELS.length - 1;
    const b4x = isLast ? 380 : 480;
    const b4y = isLast ? 320 : 278;
    const isHov4 = hoverBtn === 4;
    push();
    translate(b4x, b4y);
    scale(isHov4 ? 1.05 : 1.0);
    fill(isHov4 ? '#4338ca' : '#312e81');
    noStroke();
    rect(-80, -23, 160, 46, 10);
    textSize(16);
    textStyle(BOLD);
    fill(255);
    text('選擇關卡', 0, 0);
    pop();

    // Confetti sparks
    for (let i = 0; i < 3; i++) {
      if (successTimer % 8 === i) {
        const colors = ['#ffd700','#a78bfa','#34d399','#60a5fa','#f472b6'];
        for (let j = 0; j < 6; j++) {
          const a = random(TWO_PI);
          const s = random(3, 7);
          sparkParticles.push({
            x: random(100, 660),
            y: random(50, 250),
            vx: cos(a) * s,
            vy: sin(a) * s - 2,
            life: 1.0,
            color: random(colors)
          });
        }
      }
    }
  }
}

// ─── Draw glow helper ──────────────────────────────────────────────────────────

function drawGlow(x, y, r, hexColor, alpha) {
  const c = color(hexColor);
  c.setAlpha(alpha * 255);
  noStroke();
  fill(c);
  circle(x, y, r * 2);
}

// ─── Custom Cursor ─────────────────────────────────────────────────────────────

function drawCustomCursor(x, y) {
  if (state === 'playing') {
    cursorHistory = []; // 遊戲中清除歷史紀錄
    return;
  }

  // 更新歷史位置紀錄
  cursorHistory.push({ x, y });
  if (cursorHistory.length > 12) {
    cursorHistory.shift();
  }

  const isHovering = hoverBtn !== -1;
  const cursorCol = isHovering ? color('#60a5fa') : color(255, 255, 255, 200);

  push();
  // 1. 繪製拖曳拖尾效果
  noStroke();
  for (let i = 0; i < cursorHistory.length; i++) {
    let pos = cursorHistory[i];
    // 越舊的點（索引越小）越透明、越小
    let alpha = map(i, 0, cursorHistory.length, 0, 100);
    let size = map(i, 0, cursorHistory.length, 2, 8);
    fill(red(cursorCol), green(cursorCol), blue(cursorCol), alpha);
    circle(pos.x, pos.y, size);
  }

  // 2. 繪製主游標
  translate(x, y);
  
  // 繪製一個旋轉的菱形
  rotate(frameCount * 0.05);
  noFill();
  stroke(cursorCol);
  strokeWeight(2);
  rectMode(CENTER);
  rect(0, 0, 12, 12);
  
  // 繪製中心點
  fill(cursorCol);
  noStroke();
  circle(0, 0, 4);
  
  // 裝飾外圈
  strokeWeight(1);
  noFill();
  const pulse = 15 + sin(frameCount * 0.1) * 3;
  circle(0, 0, pulse);
  
  pop();
}