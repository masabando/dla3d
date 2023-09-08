import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let loop;

// DLA
// 3次元配列で管理
class DLA {
  constructor(size) {
    this.setSize(size);
    this.finFlag = false;
    this.current = false;
  }
  // 3次元配列のサイズ変更
  setSize(size) {
    this.size = size;
    this.margin = Math.floor(size / 2);
    this.data = new Array(size).fill(0).map(
      () => new Array(size).fill(0).map(
        () => new Array(size).fill(false)
      )
    );
  }
  // 初期化
  clear() {
    this.finFlag = false;
    this.current = false;
    setTimeout(() => {
      this.data = new Array(this.size).fill(0).map(
        () => new Array(this.size).fill(0).map(
          () => new Array(this.size).fill(false)
        )
      );
    }, 1000);
  }
  // 手動でブロックを配置(初期の種用)
  manualFix(x, y, z) {
    this.data[x + this.margin][y + this.margin][z + this.margin] = true;
  }
  // 固定
  fix() {
    this.data[this.current[0]][this.current[1]][this.current[2]] = true;
  }
  // 範囲内の乱数発生
  rand() {
    return Math.floor(Math.random() * this.data.length);
  }
  // 新規の種を生成
  generate() {
    let direction = Math.floor(Math.random() * 6);
    switch (direction) {
      case 0:
        this.current = [0, this.rand(), this.rand()];
        break;
      case 1:
        this.current = [this.data.length - 1, this.rand(), this.rand()];
        break;
      case 2:
        this.current = [this.rand(), 0, this.rand()];
        break;
      case 3:
        this.current = [this.rand(), this.data.length - 1, this.rand()];
        break;
      case 4:
        this.current = [this.rand(), this.rand(), 0];
        break;
      case 5:
        this.current = [this.rand(), this.rand(), this.data.length - 1];
        break;
    }
  }
  // 移動
  walk() {
    let [x, y, z] = this.current;
    let direction = Math.floor(Math.random() * 6);
    switch (direction) {
      case 0:
        x++;
        if (x >= this.data.length) x = 0;
        break;
      case 1:
        x--;
        if (x < 0) x = this.data.length - 1;
        break;
      case 2:
        y++;
        if (y >= this.data.length) y = 0;
        break;
      case 3:
        y--;
        if (y < 0) y = this.data.length - 1;
        break;
      case 4:
        z++;
        if (z >= this.data.length) z = 0;
        break;
      case 5:
        z--;
        if (z < 0) z = this.data.length - 1;
        break;
    }
    this.current = [x, y, z];
  }
  // 接触判定
  check() {
    let [x, y, z] = this.current;
    return (
      (this.data[x][y][z - 1] ?? false) ||
      (this.data[x][y][z + 1] ?? false) ||
      (this.data[x][y - 1]?.[z]) ||
      (this.data[x][y + 1]?.[z]) ||
      (this.data[x - 1]?.[y][z]) ||
      (this.data[x + 1]?.[y][z])
    );
  }
  // 1ステップ進める
  // 高速化のために移動は最大100回行う
  // 移動後に接触したら固定
  // 移動が終了(固定)していたら新規で種を生成
  step() {
    if (this.finFlag) return false;
    if (this.current === false) {
      this.generate();
    } else {
      let count = 100;
      while (count-- > 0 || this.current) {
        this.walk();
        if (this.check()) {
          this.fix();
          if (
            this.current[0] === 0
            || this.current[0] === this.data.length - 1
            || this.current[1] === 0
            || this.current[1] === this.data.length - 1
            || this.current[2] === 0
            || this.current[2] === this.data.length - 1
          ) this.finFlag = true;
          let res = this.current;
          this.current = false;
          return res;
        }
      }
    }
    return false;
  }
}


// Three.js周りの管理
class ThreeManager {
  constructor(canvas, size) {
    this.size = size;
    // clock
    // これで時間管理することで、FPSによらず一定の速度で動作するようになる
    this.clock = new THREE.Clock();
    // DLA
    this.dla = new DLA(size);
    this.boxMaterial = new THREE.MeshNormalMaterial();
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.edgeMaterial = new THREE.LineBasicMaterial({ color: 0x777777 });
    this.edgeGeometry = new THREE.EdgesGeometry(this.boxGeometry);
    this.edge = new THREE.LineSegments(this.edgeGeometry, this.edgeMaterial);
    this.cubes = [];

    // Three.js の初期設定
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(size*0.3, size*0.3, size*0.9);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // OrbitControls (マウスでカメラを回転)
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.2;
    this.orbitControls.minDistance = 2;
    this.orbitControls.maxDistance = Infinity;
    // Lights (照明)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.scene.add(this.directionalLight);
    // Group (DLA全体のオブジェクト。固定した種はここに入れる)
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  // 空間のサイズ変更
  setSize(size) {
    this.size = size;
    this.dla.setSize(size);
    this.camera.position.set(size * 0.3, size * 0.3, size * 0.9);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // メインループ
  loop() {
    loop = requestAnimationFrame(() => this.loop());
    let res = this.dla.step();
    if (res) {
      this.fix(...(res.map(p => p - this.dla.margin)))
    }
    this.group.rotation.y -= this.clock.getDelta() * 0.5;
    this.orbitControls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // 種を固定するときの処理
  fix(x, y, z) {
    let mesh = new THREE.Mesh(this.boxGeometry, this.boxMaterial);
    mesh.add(this.edge.clone())
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    this.cubes.push(mesh);
  }

  // 手動で種を固定するときの処理
  manualFix(x, y, z) {
    this.dla.manualFix(x, y, z);
    this.fix(x, y, z);
  }

  // リセット
  clear() {
    cancelAnimationFrame(loop);
    setTimeout(() => {
      let size = +document.querySelector('#selectSize').value;
      this.dla.clear();
      this.cubes.forEach(cube => this.scene.remove(cube));
      this.cubes = [];
      this.setSize(size);
      this.manualFix(0, 0, 0);
      this.loop()
    }, 200);
  }

  // ウィンドウサイズ変更時の処理
  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

}

// 空間サイズ
let size = +document.querySelector('#selectSize').value;

// Three.jsの管理
const canvas = document.getElementById('canvas');
const threeManager = new ThreeManager(canvas, size);
threeManager.manualFix(0, 0, 0);
threeManager.loop();

// リサイズ時の処理
window.addEventListener("resize", () => threeManager.resize());

// リセットボタン
document.querySelector('#restartButton').addEventListener('click', () => {
  threeManager.clear();
});
