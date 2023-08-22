import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let loop;

class DLA {
  constructor(size) {
    this.setSize(size);
    this.finFlag = false;
    this.current = false;
  }
  setSize(size) {
    this.size = size;
    this.margin = Math.floor(size / 2);
    this.data = new Array(size).fill(0).map(
      () => new Array(size).fill(0).map(
        () => new Array(size).fill(false)
      )
    );
  }
  clear() {
    this.data = new Array(this.size).fill(0).map(
      () => new Array(this.size).fill(0).map(
        () => new Array(this.size).fill(false)
      )
    );
    this.finFlag = false;
    this.current = false;
  }
  manualFix(x, y, z) {
    this.data[x + this.margin][y + this.margin][z + this.margin] = true;
  }
  fix() {
    this.data[this.current[0]][this.current[1]][this.current[2]] = true;
  }
  rand() {
    return Math.floor(Math.random() * this.data.length);
  }
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


class ThreeManager {
  constructor(canvas, size) {
    this.size = size;
    // clock
    this.clock = new THREE.Clock();
    // DLA
    this.dla = new DLA(size);
    this.boxMaterial = new THREE.MeshNormalMaterial();
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.edgeMaterial = new THREE.LineBasicMaterial({ color: 0x777777 });
    this.edgeGeometry = new THREE.EdgesGeometry(this.boxGeometry);
    this.edge = new THREE.LineSegments(this.edgeGeometry, this.edgeMaterial);
    this.cubes = [];

    // Three.js init
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
    // OrbitControls
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.2;
    this.orbitControls.minDistance = 2;
    this.orbitControls.maxDistance = Infinity;
    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.scene.add(this.directionalLight);
    // Group
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  setSize(size) {
    this.size = size;
    this.dla.setSize(size);
    this.camera.position.set(size * 0.3, size * 0.3, size * 0.9);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

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

  fix(x, y, z) {
    let mesh = new THREE.Mesh(this.boxGeometry, this.boxMaterial);
    mesh.add(this.edge.clone())
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    this.cubes.push(mesh);
  }

  manualFix(x, y, z) {
    this.dla.manualFix(x, y, z);
    this.fix(x, y, z);
  }

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

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

}


let size = +document.querySelector('#selectSize').value;

const canvas = document.getElementById('canvas');
const threeManager = new ThreeManager(canvas, size);
threeManager.manualFix(0, 0, 0);
threeManager.loop();

window.addEventListener("resize", () => threeManager.resize());

document.querySelector('#restartButton').addEventListener('click', () => {
  threeManager.clear();
});
