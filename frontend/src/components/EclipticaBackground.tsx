import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'

const TEXTURE_SIZE = 1024
const PARTICLES = TEXTURE_SIZE * TEXTURE_SIZE
const TEXTURE_ARRAY_SIZE = TEXTURE_SIZE * TEXTURE_SIZE * 4

const vertexShaderParticle = /* glsl */ `
  uniform sampler2D u_noise;
  attribute vec2 reference;
  uniform sampler2D texturePosition;
  varying float v_op;

  void main() {
    vec3 pos = texture2D(texturePosition, reference).xyz;
    pos *= 3.0;
    vec4 mvpos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = clamp(3.0 - length(pos) * 0.01, 0.0, 4.0);
    v_op = 1.0 / length(pos) * 8.0;
    gl_Position = projectionMatrix * mvpos;
  }
`

const fragmentShaderParticle = /* glsl */ `
  uniform sampler2D u_noise;
  uniform float u_time;
  varying float v_op;

  void main() {
    vec2 uv = gl_PointCoord.xy - 0.5;

    float dist = v_op;
    float t = smoothstep(3.0, 0.15, dist);

    vec3 core = vec3(4.0, 4.2, 4.5);
    vec3 mid = vec3(1.2, 1.0, 0.85);
    vec3 outer = vec3(0.3, 0.28, 0.32);

    vec3 particlecolour = mix(mid, core, t);
    particlecolour = mix(outer, particlecolour, smoothstep(0.6, 0.0, 1.0 / dist));

    float l = length(uv);
    vec3 colour = particlecolour * smoothstep(0.5, -0.1, l);

    float alpha = clamp(dist * 1.5, 0.0, 1.0) * smoothstep(0.5, 0.0, l);

    gl_FragColor = vec4(colour, alpha);
  }
`

const fragmentShaderVelocity = /* glsl */ `
  uniform float u_time;
  uniform float u_mousex;

  const float nudge = 0.739513;
  float normalizer = 1.0 / sqrt(1.0 + nudge * nudge);

  float SpiralNoiseC(vec3 p) {
    float n = 0.0;
    float iter = 1.0;
    for (int i = 0; i < 8; i++) {
      n += -abs(sin(p.y * iter) + cos(p.x * iter)) / iter;
      p.xy += vec2(p.y, -p.x) * nudge;
      p.xy *= normalizer;
      p.xz += vec2(p.z, -p.x) * nudge;
      p.xz *= normalizer;
      iter *= 1.733733;
    }
    return n;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 position = texture2D(v_samplerPosition, uv).xyz;
    vec3 velocity = texture2D(v_samplerVelocity, uv).xyz;
    vec3 acceleration = vec3(0.0);
    float l = clamp(length(position), 1.0, 100.0);
    vec3 spherical = vec3(
      1.0 / l * l,
      atan(position.y, position.x),
      acos(position.z / l)
    );
    float n = SpiralNoiseC(vec3(l, sin(spherical.yz * 3.0 + u_time * 15.0)));
    spherical.xy += n * 0.5;
    spherical.x += 1.0 / length(position) * 0.5;
    spherical.x += smoothstep(5.0, 20.0, length(position));
    acceleration.x = spherical.x * sin(spherical.z) * cos(spherical.y);
    acceleration.y = spherical.x * sin(spherical.z) * sin(spherical.y);
    acceleration.z = spherical.x * cos(spherical.z);
    gl_FragColor = vec4(velocity * 0.95 + acceleration * 0.2, 1.0);
  }
`

const fragmentShaderPosition = /* glsl */ `
  uniform float delta;
  uniform float u_time;
  uniform sampler2D v_samplerPosition_orig;
  uniform sampler2D u_noise;

  vec3 hash3(vec2 p) {
    vec3 o = texture2D(u_noise, (p + 0.5) / 256.0, -100.0).xyz;
    return o;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 position_original = texture2D(v_samplerPosition_orig, uv).xyz;
    vec3 position = texture2D(v_samplerPosition, uv).xyz;
    vec3 velocity = texture2D(v_samplerVelocity, uv).xyz;
    vec3 pos = position + velocity * delta;
    vec3 hash = hash3(position_original.xy * position_original.zx * 20.0);
    pos *= 1.0 + (hash - 0.5) * 0.0005;
    pos += (hash - 0.5) * 0.001;
    vec2 p = vec2(atan(pos.y, pos.x), length(pos.xy));
    p.x -= velocity.x * 0.001 + 0.0001;
    pos.x = cos(p.x) * p.y;
    pos.y = sin(p.x) * p.y;
    pos.z += 0.005;
    if (length(pos) > 20.0) {
      pos = position_original;
    }
    gl_FragColor = vec4(pos, 1.0);
  }
`

function createNoiseTexture(): THREE.DataTexture {
  const size = 256
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 255
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

export function EclipticaBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current!
    if (!container) return

    let animationId = 0
    let renderer: THREE.WebGLRenderer
    let camera: THREE.PerspectiveCamera
    let scene: THREE.Scene
    let gpuCompute: GPUComputationRenderer
    let uniforms: Record<string, THREE.IUniform>
    let textureVelocity: ReturnType<GPUComputationRenderer['addVariable']>
    let texturePosition: ReturnType<GPUComputationRenderer['addVariable']>
    let then = Date.now() / 1000
    let disposed = false

    function boot(noiseTexture: THREE.Texture) {
      if (disposed) return
      noiseTexture.wrapS = THREE.RepeatWrapping
      noiseTexture.wrapT = THREE.RepeatWrapping
      noiseTexture.minFilter = THREE.LinearFilter
      init(noiseTexture)
      animate()
    }

    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    loader.load(
      'https://s3-us-west-2.amazonaws.com/s.cdpn.io/982762/noise.png',
      (tex) => boot(tex),
      undefined,
      () => boot(createNoiseTexture())
    )

    function init(noiseTexture: THREE.Texture) {
      camera = new THREE.PerspectiveCamera(45, 1, 0.001, Math.pow(2, 16))
      camera.position.set(-10, -10, -30)
      camera.lookAt(12, -2, 0)

      scene = new THREE.Scene()
      scene.background = new THREE.Color(0x000000)

      const vertices = new Float32Array(PARTICLES * 3).fill(0)
      const references = new Float32Array(PARTICLES * 2)

      for (let i = 0; i < references.length; i += 2) {
        const index = i / 2
        references[i] = (index % TEXTURE_SIZE) / TEXTURE_SIZE
        references[i + 1] = Math.floor(index / TEXTURE_SIZE) / TEXTURE_SIZE
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      geometry.setAttribute('reference', new THREE.BufferAttribute(references, 2))

      uniforms = {
        u_time: { value: 1.0 },
        u_resolution: { value: new THREE.Vector2() },
        u_noise: { value: noiseTexture },
        u_mouse: { value: new THREE.Vector2() },
        texturePosition: { value: null },
      }

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vertexShaderParticle,
        fragmentShader: fragmentShaderParticle,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        side: THREE.DoubleSide,
      })

      const cloud = new THREE.Points(geometry, material)
      scene.add(cloud)

      renderer = new THREE.WebGLRenderer({ antialias: false })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(container.clientWidth, container.clientHeight)
      container.appendChild(renderer.domElement)

      gpuCompute = new GPUComputationRenderer(TEXTURE_SIZE, TEXTURE_SIZE, renderer)

      const dataPos = gpuCompute.createTexture()
      const dataVel = gpuCompute.createTexture()
      const dataPosOrig = gpuCompute.createTexture()

      for (let i = 0; i < TEXTURE_ARRAY_SIZE; i += 4) {
        const phi = Math.random() * Math.PI * 2
        const costheta = Math.random() * 2 - 1
        const u = Math.random()
        const theta = Math.acos(costheta)
        const r = Math.cbrt(u)

        const x = r * Math.sin(theta) * Math.cos(phi)
        const y = r * Math.sin(theta) * Math.sin(phi)
        const z = r * Math.cos(theta)

        dataPos.image.data[i] = x
        dataPos.image.data[i + 1] = y
        dataPos.image.data[i + 2] = z
        dataPos.image.data[i + 3] = 1

        dataPosOrig.image.data[i] = x
        dataPosOrig.image.data[i + 1] = y
        dataPosOrig.image.data[i + 2] = z
        dataPosOrig.image.data[i + 3] = 1

        dataVel.image.data[i] = x * 3
        dataVel.image.data[i + 1] = y * 3
        dataVel.image.data[i + 2] = z * 3
        dataVel.image.data[i + 3] = 1
      }

      textureVelocity = gpuCompute.addVariable(
        'v_samplerVelocity',
        fragmentShaderVelocity,
        dataVel
      )
      texturePosition = gpuCompute.addVariable(
        'v_samplerPosition',
        fragmentShaderPosition,
        dataPos
      )

      texturePosition.material.uniforms.delta = { value: 0 }
      texturePosition.material.uniforms.v_samplerPosition_orig = { value: dataPosOrig }
      texturePosition.material.uniforms.u_noise = { value: noiseTexture }
      textureVelocity.material.uniforms.u_time = { value: -1000 }
      textureVelocity.material.uniforms.u_mousex = { value: 0 }
      texturePosition.material.uniforms.u_time = { value: 0 }

      gpuCompute.setVariableDependencies(textureVelocity, [textureVelocity, texturePosition])
      gpuCompute.setVariableDependencies(texturePosition, [textureVelocity, texturePosition])

      texturePosition.wrapS = THREE.RepeatWrapping
      texturePosition.wrapT = THREE.RepeatWrapping
      textureVelocity.wrapS = THREE.RepeatWrapping
      textureVelocity.wrapT = THREE.RepeatWrapping

      const err = gpuCompute.init()
      if (err) console.error('GPUComputationRenderer error:', err)

      onResize()
      window.addEventListener('resize', onResize)
      document.addEventListener('pointermove', onPointerMove)
    }

    function onResize() {
      if (!renderer || !camera || !container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      if (uniforms) {
        uniforms.u_resolution.value.x = w
        uniforms.u_resolution.value.y = h
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!uniforms || !textureVelocity) return
      const ratio = window.innerHeight / window.innerWidth
      textureVelocity.material.uniforms.u_mousex.value = e.pageX
      uniforms.u_mouse.value.x =
        (e.pageX - window.innerWidth / 2) / window.innerWidth / ratio
      uniforms.u_mouse.value.y =
        ((e.pageY - window.innerHeight / 2) / window.innerHeight) * -1
    }

    function animate() {
      if (disposed) return
      animationId = requestAnimationFrame(animate)
      render()
    }

    function render() {
      if (!gpuCompute || !renderer || !scene || !camera) return
      const now = Date.now() / 1000
      const dt = now - then
      then = now

      gpuCompute.compute()

      texturePosition.material.uniforms.delta.value = Math.min(dt, 0.5)
      textureVelocity.material.uniforms.u_time.value += 0.0005
      texturePosition.material.uniforms.u_time.value += dt
      uniforms.u_time.value += dt
      uniforms.texturePosition.value =
        gpuCompute.getCurrentRenderTarget(texturePosition).texture

      renderer.render(scene, camera)
    }

    return () => {
      disposed = true
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('pointermove', onPointerMove)
      if (renderer) {
        renderer.dispose()
        renderer.domElement.remove()
      }
    }
  }, [])

  return <div ref={containerRef} className="ecliptica-bg" />
}
