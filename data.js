/* ═══════════════════════════════════════════════════════════════════════
   DRONESTICA — DATA LAYER
   Productora Cinematográfica con Drones
   ═══════════════════════════════════════════════════════════════════════
   Único objeto JSON con toda la información del estudio.
   Consumido dinámicamente por la interfaz.
   ═══════════════════════════════════════════════════════════════════════ */

const DATA = {
  studio: {
    id: "drn-studio-001",
    name: "Dronestica",
    tagline: "Cine desde el cielo",
    description: "Productora cinematográfica especializada en captura aérea con drones. Servicios de alto nivel para cine, televisión, publicidad y documentales.",
    about: {
      founded: 2018,
      headquarters: "Ciudad de México, MX",
      offices: [
        { city: "Ciudad de México", country: "MX", lat: 19.4326, lng: -99.1332, timezone: "America/Mexico_City", isMain: true },
        { city: "Los Ángeles", country: "US", lat: 34.0522, lng: -118.2437, timezone: "America/Los_Angeles", isMain: false },
        { city: "Madrid", country: "ES", lat: 40.4168, lng: -3.7038, timezone: "Europe/Madrid", isMain: false },
        { city: "Bogotá", country: "CO", lat: 4.711, lng: -74.0721, timezone: "America/Bogota", isMain: false }
      ],
      teamSize: 47,
      missionsCompleted: 2840,
      hoursFlown: 12480,
      countriesReached: 12,
      awards: 23,
      certifications: [
        "DGAC", "FAA Part 107", "EASA", "ISO 9001:2015", "ISO 27001:2022"
      ],
      mission: "Llevar la narrativa visual a nuevas alturas mediante tecnología de drones de vanguardia.",
      values: [
        { name: "Precisión", description: "Cada plano calculado al milímetro." },
        { name: "Seguridad", description: "La seguridad es siempre lo primero." },
        { name: "Creatividad", description: "Volamos para contar historias únicas." },
        { name: "Innovación", description: "Tecnología antes que el mercado." },
        { name: "Sostenibilidad", description: "Compensamos el 200% de nuestra huella de carbono." }
      ],
      sustainability: {
        carbonOffsetProgram: "Reforestamos 10 árboles por cada hora de vuelo",
        treesPlanted: 124800,
        partnerships: ["Reforestamos MX", "One Tree Planted", "WWF México"]
      }
    },
    contact: {
      email: "hola@dronestica.com",
      phone: "+52 55 1234 5678",
      address: "Av. Insurgentes Sur 1234, Col. Del Valle, CDMX, 03100",
      bookingUrl: "https://dronestica.com/agendar"
    },
    branding: {
      logo: { primary: "/assets/logo.svg", icon: "/assets/icon.svg", favicon: "/assets/favicon.svg" },
      colors: { primary: "#d4a800", secondary: "#03050a", accent: "#f0c000" },
      fonts: { display: "Cabinet Grotesk", body: "Inter", mono: "JetBrains Mono" }
    }
  }

  team: [
    {
      id: "usr-001", name: "Alejandro Mendoza", role: "Director de Fotografía Aérea",
      bio: "Más de 15 años en producción cinematográfica. Ha trabajado con Netflix, HBO y BBC.",
      avatar: "/assets/team/alejandro-mendoza.jpg",
      skills: ["Pilotaje cinematográfico", "Dirección de fotografía", "Color grading"],
      certifications: ["FAA Part 107", "DGAC Piloto Comercial", "EASA Drone Operator"],
      yearsOfExperience: 15,
      featuredProjects: ["proj-001", "proj-004", "proj-007"],
      languages: ["es-MX", "en-US"]
    },
    {
      id: "usr-002", name: "Mariana García", role: "Piloto Profesional y DP",
      bio: "Piloto comercial con formación en cinematografía. Especialista en tomas de alta velocidad.",
      avatar: "/assets/team/mariana-garcia.jpg",
      skills: ["Vuelo FPV cinematográfico", "Tomas de acción", "Pilotaje nocturno"],
      certifications: ["DGAC Piloto Comercial", "FAA Part 107", "DJI Master Pilot"],
      yearsOfExperience: 10,
      featuredProjects: ["proj-002", "proj-005", "proj-008"],
      languages: ["es-MX", "en-US", "fr-FR"]
    },
    {
      id: "usr-003", name: "Carlos Ruiz", role: "Piloto de Cine y Acrobacias",
      bio: "Piloto de carreras FPV reconvertido a cine. Especialista en interiores y persecuciones.",
      avatar: "/assets/team/carlos-ruiz.jpg",
      skills: ["FPV cinematográfico", "Vuelo en interiores", "Persecución de vehículos"],
      certifications: ["DGAC Piloto Comercial", "FAA Part 107"],
      yearsOfExperience: 8,
      featuredProjects: ["proj-003", "proj-006", "proj-009"],
      languages: ["es-MX", "en-US"]
    },
    {
      id: "usr-004", name: "Ana Lucía Herrera", role: "Directora de Producción",
      bio: "Productora ejecutiva con experiencia en grandes producciones. Coordina equipos de hasta 20 personas.",
      avatar: "/assets/team/ana-herrera.jpg",
      skills: ["Gestión de producción", "Logística de locaciones", "Presupuestos"],
      certifications: ["PMP", "Lean Six Sigma Green Belt"],
      yearsOfExperience: 12,
      featuredProjects: ["proj-001", "proj-007", "proj-010"],
      languages: ["es-MX", "en-US", "de-DE"]
    },
    {
      id: "usr-005", name: "Diego Torres", role: "Editor y Colorista Senior",
      bio: "Editor certificado DaVinci Resolve con 11 años de experiencia.",
      avatar: "/assets/team/diego-torres.jpg",
      skills: ["Edición no lineal", "Color grading DaVinci Resolve", "Composición VFX"],
      certifications: ["DaVinci Resolve Certified Trainer", "Adobe Premiere Pro Certified"],
      yearsOfExperience: 11,
      featuredProjects: ["proj-004", "proj-007", "proj-010"],
      languages: ["es-MX", "en-US", "it-IT"]
    },
    {
      id: "usr-006", name: "Sofía Ramírez", role: "Especialista en Data y Telemetría",
      bio: "Ingeniera en sistemas con especialización en IoT y telemetría de drones.",
      avatar: "/assets/team/sofia-ramirez.jpg",
      skills: ["Telemetría de drones", "Procesamiento geoespacial", "Automatización"],
      certifications: ["AWS Certified Solutions Architect"],
      yearsOfExperience: 7,
      featuredProjects: ["proj-005", "proj-008"],
      languages: ["es-MX", "en-US"]
    },
    {
      id: "usr-007", name: "Gabriel Nava", role: "Piloto de Carga y FPV",
      bio: "Piloto con experiencia en drones de carga para cine. Especialista en montaje de equipos cinematográficos.",
      avatar: "/assets/team/gabriel-nava.jpg",
      skills: ["Drones de carga pesada", "Montaje de cámara", "Vuelo FPV"],
      certifications: ["DGAC Piloto Comercial Drones Clase D", "FAA Part 107"],
      yearsOfExperience: 9,
      featuredProjects: ["proj-006", "proj-009"],
      languages: ["es-MX", "en-US"]
    },
    {
      id: "usr-008", name: "Renata Flores", role: "Directora de Arte Aérea",
      bio: "Arquitecta especializada en planificación visual de tomas aéreas y diseño de rutas.",
      avatar: "/assets/team/renata-flores.jpg",
      skills: ["Dirección de arte", "Storyboard aéreo", "Planificación visual"],
      certifications: ["DGAC Planeación de Vuelo"],
      yearsOfExperience: 10,
      featuredProjects: ["proj-001", "proj-004", "proj-010"],
      languages: ["es-MX", "en-US", "pt-BR"]
    }
  ],

  fleet: {
    total: 24,
    drones: [
      {
        id: "drn-001", name: "Alpha-7", model: "DJI Inspire 3", manufacturer: "DJI",
        type: "cinema", year: 2024, status: "flying",
        cameraPayload: {
          model: "Zenmuse X9-8K", sensor: "Full Frame 35mm",
          resolution: "8K DCI", dynamicRange: "14+ stops",
          codec: "Apple ProRes RAW / CinemaDNG"
        },
        telemetry: { battery: 73, signal: -42, speed: 12.5, altitude: 120, heading: 270, gpsSats: 14, temperature: 42 },
        flightStats: { totalHours: 342, totalMissions: 187, averageFlightTime: 22 },
        specifications: { weight: 3995, maxSpeed: 21, maxFlightTime: 28, maxWindResistance: 12 },
        assignedPilot: "usr-001", currentMission: "mis-001",
        location: { lat: 19.4326, lng: -99.1332, altitude: 120 }
      },
      {
        id: "drn-002", name: "Bravo-3", model: "DJI Mavic 3 Pro Cine", manufacturer: "DJI",
        type: "cinema", year: 2024, status: "flying",
        cameraPayload: {
          model: "Hasselblad L2D-20c + Tele 166mm", sensor: "4/3 CMOS",
          resolution: "5.1K", dynamicRange: "12.8 stops", codec: "Apple ProRes 422 HQ"
        },
        telemetry: { battery: 91, signal: -38, speed: 8.3, altitude: 85, heading: 45, gpsSats: 16, temperature: 38 },
        flightStats: { totalHours: 218, totalMissions: 142, averageFlightTime: 26 },
        specifications: { weight: 2450, maxSpeed: 19, maxFlightTime: 43 },
        assignedPilot: "usr-002", currentMission: "mis-002",
        location: { lat: 19.45, lng: -99.15, altitude: 85 }
      },
      {
        id: "drn-003", name: "Charlie-X", model: "DJI Matrice 350 RTK", manufacturer: "DJI",
        type: "payload", year: 2023, status: "idle",
        cameraPayload: { model: "Zenmuse H20T", sensors: "Térmica + Zoom + Láser", resolution: "4K UHD" },
        specifications: { weight: 4820, maxTakeoffWeight: 6340, maxFlightTime: 55, maxWindResistance: 15 },
        flightStats: { totalHours: 410, totalMissions: 223, averageFlightTime: 35 },
        assignedPilot: "usr-007", currentMission: null,
        location: { lat: 19.4326, lng: -99.1332, altitude: 0 }
      },
      {
        id: "drn-004", name: "Delta-9", model: "DJI Avata 2", manufacturer: "DJI",
        type: "fpv", year: 2024, status: "flying",
        cameraPayload: { model: "Built-in 4K Ultra-Wide", sensor: "1/1.3-inch", resolution: "4K UHD", maxFps: { "4K": 60, "2.7K": 120 } },
        specifications: { weight: 377, maxSpeed: 27, maxFlightTime: 23 },
        flightStats: { totalHours: 87, totalMissions: 64, averageFlightTime: 14 },
        assignedPilot: "usr-003", currentMission: "mis-003",
        location: { lat: 19.42, lng: -99.145, altitude: 15 }
      },
      {
        id: "drn-005", name: "Echo-M", model: "Freefly Alta X", manufacturer: "Freefly Systems",
        type: "heavy-payload", year: 2023, status: "flying",
        cameraPayload: {
          model: "ARRI ALEXA 35 + ARRI Signature Prime 35mm",
          sensor: "ALEV 4 Super 35", resolution: "4.6K DCI",
          dynamicRange: "17+ stops", codec: "ARRIRAW / ProRes 4444 XQ"
        },
        specifications: { weight: 14900, maxTakeoffWeight: 23000, maxPayload: 8100, maxFlightTime: 18 },
        flightStats: { totalHours: 156, totalMissions: 83, averageFlightTime: 14 },
        assignedPilot: "usr-007", currentMission: "mis-004",
        location: { lat: 19.41, lng: -99.12, altitude: 55 }
      },
      {
        id: "drn-006", name: "Foxtrot-2", model: "DJI Mavic 3 Enterprise", manufacturer: "DJI",
        type: "enterprise", year: 2023, status: "charging",
        cameraPayload: { model: "Zenmuse P1", sensor: "Full Frame 45MP", resolution: "8K" },
        specifications: { weight: 3770, maxFlightTime: 45 },
        flightStats: { totalHours: 205, totalMissions: 118, averageFlightTime: 30 },
        assignedPilot: "usr-001", currentMission: null,
        location: { lat: 19.4326, lng: -99.1332, altitude: 0 }
      },
      {
        id: "drn-007", name: "Golf-FPV1", model: "Custom FPV Cinewhoop", manufacturer: "Custom ImpulseRC",
        type: "fpv", year: 2024, status: "flying",
        cameraPayload: { model: "GoPro Hero 12 Black", resolution: "5.3K", maxFps: { "5.3K": 60, "4K": 120, "2.7K": 240 } },
        specifications: { weight: 348, maxSpeed: 31, maxFlightTime: 6 },
        flightStats: { totalHours: 62, totalMissions: 48, averageFlightTime: 4.5 },
        assignedPilot: "usr-003", currentMission: "mis-003",
        location: { lat: 19.435, lng: -99.13, altitude: 8 }
      },
      {
        id: "drn-008", name: "Helios-1", model: "DJI Matrice 30T", manufacturer: "DJI",
        type: "enterprise", year: 2022, status: "maintenance",
        specifications: { weight: 3770, maxFlightTime: 41 },
        flightStats: { totalHours: 520, totalMissions: 310, averageFlightTime: 28 },
        assignedPilot: "usr-002", currentMission: null,
        location: { lat: 19.4326, lng: -99.1332, altitude: 0 }
      }
    ]
  },

  services: [
    {
      id: "svc-001", slug: "filmacion-cinematografica",
      name: "Filmacion Cinematografica Aerea",
      category: "cine",
      description: "Captura aerea con drones cinematicos equipados con camaras ARRI, RED y DJI Pro.",
      icon: "camera-reel",
      deliverables: ["Archivos RAW", "ProRes 4444 XQ", "LUTs personalizados", "Metadata de vuelo"],
      compatibleCameras: [
        { model: "ARRI ALEXA 35", sensor: "Super 35", maxPayload: 8100 },
        { model: "ARRI ALEXA Mini LF", sensor: "Large Format", maxPayload: 7000 },
        { model: "RED V-RAPTOR XL", sensor: "VistaVision 8K", maxPayload: 7500 },
        { model: "Sony VENICE 2", sensor: "Full Frame 8.6K", maxPayload: 7200 }
      ],
      formats: ["ARRIRAW", "REDCODE RAW", "CinemaDNG", "ProRes RAW", "ProRes 4444 XQ"],
      resolutions: ["8K DCI", "6K", "4.6K", "4K DCI", "UHD 4K"],
      useCases: ["Largometrajes", "Series", "Comerciales", "Documentales", "Branded content"],
      pricing: { from: 85000, currency: "MXN", unit: "jornada de 8h",
        packages: [
          { name: "Media Jornada", hours: 4, price: 48000, popular: false },
          { name: "Jornada Completa", hours: 8, price: 85000, popular: true },
          { name: "Jornada Extendida", hours: 12, price: 120000, popular: false },
          { name: "Paquete Semanal", hours: 40, price: 360000, popular: false }
        ]
      },
      tags: ["cine", "publicidad", "documental", "alta-gama", "largometraje"],
      featuredProject: "proj-001", order: 1
    },
    {
      id: "svc-002", slug: "publicidad-aerea",
      name: "Publicidad Aerea",
      category: "commercial",
      description: "Comerciales para television y plataformas digitales. Tomas aereas impactantes.",
      icon: "megaphone",
      deliverables: ["Archivos 4K-8K", "Versiones TV y digital", "Versiones verticales", "Color grading"],
      formats: ["ProRes 422 HQ", "H.264", "H.265", "WebM VP9"],
      resolutions: ["8K DCI", "4K DCI", "UHD 4K", "FHD 1080p", "1080x1920 vertical"],
      useCases: ["Comerciales de autos", "Turismo", "Bienes raices", "Moda", "Alimentos"],
      pricing: { from: 35000, currency: "MXN", unit: "spot",
        packages: [
          { name: "Spot Basico", deliverables: "1 toma aerea", price: 35000, popular: false },
          { name: "Spot Estandar", deliverables: "3-5 tomas aereas", price: 65000, popular: true },
          { name: "Spot Premium", deliverables: "Produccion aerea completa", price: 120000, popular: false }
        ]
      },
      tags: ["publicidad", "comercial", "marca", "digital", "tv"],
      featuredProject: "proj-003", order: 2
    },
    {
      id: "svc-003", slug: "documentales-naturaleza",
      name: "Documentales y Naturaleza",
      category: "documentary",
      description: "Expediciones de filmacion aerea en entornos remotos. Selvas, desiertos, oceanos.",
      icon: "tree",
      deliverables: ["Archivos 4K-6K RAW", "Log de tomas con GPS", "Informe de expedicion", "BTS"],
      formats: ["ProRes RAW", "ProRes 422 HQ", "H.265"],
      resolutions: ["6K", "5.1K", "4K DCI", "UHD 4K"],
      useCases: ["Documentales Netflix, Nat Geo, BBC", "Series documentales", "Conservacion ambiental"],
      pricing: { from: 150000, currency: "MXN", unit: "expedicion 3 dias" },
      tags: ["documental", "naturaleza", "expedicion", "conservacion", "netflix"],
      featuredProject: "proj-007", order: 3
    },
    {
      id: "svc-004", slug: "inspeccion-industrial",
      name: "Inspeccion Industrial Aerea",
      category: "industrial",
      description: "Inspecciones aereas con camaras termicas, LiDAR y fotogrametria.",
      icon: "gear",
      deliverables: ["Informe digital", "Ortofoto", "Modelo 3D", "Mapa termico", "Deteccion IA"],
      sensors: [
        { name: "Zenmuse H20T", type: "Termica + Zoom + Laser" },
        { name: "Zenmuse L1", type: "LiDAR", precision: "+-3cm" },
        { name: "Zenmuse P1", type: "Fotogrametrica 45MP" }
      ],
      useCases: ["Torres electricas", "Parques eolicos", "Plantas solares", "Minas", "Construccion"],
      pricing: { from: 25000, currency: "MXN", unit: "inspeccion" },
      tags: ["industrial", "inspeccion", "termografia", "lidar", "fotogrametria"],
      order: 4
    },
    {
      id: "svc-005", slug: "eventos-en-vivo",
      name: "Transmision en Vivo",
      category: "broadcast",
      description: "Transmision en vivo de eventos con drones. Angulos aereos integrados en directo.",
      icon: "broadcast",
      deliverables: ["Senial SDI/IP directa", "Hasta 3 drones sincronizados", "Grabacion 4K"],
      technicalSpecs: { videoLatency: "< 80ms", maxDrones: 3, integration: ["SDI", "NDI", "SRT", "RTMP", "WebRTC"] },
      useCases: ["Deportes", "Conciertos", "Corporativos", "Bodas premium", "Lanzamientos"],
      pricing: { from: 45000, currency: "MXN", unit: "evento 4h",
        packages: [
          { name: "1 Drone + Operador", drones: 1, price: 45000, popular: true },
          { name: "2 Drones + Equipo", drones: 2, price: 75000, popular: false },
          { name: "Produccion completa", drones: 3, price: 120000, popular: false }
        ]
      },
      tags: ["en-vivo", "broadcast", "deportes", "eventos", "streaming"],
      featuredProject: "proj-006", order: 5
    },
    {
      id: "svc-006", slug: "fotogrametria-3d",
      name: "Fotogrametria y Modelado 3D",
      category: "technical",
      description: "Modelos 3D de alta precision de terrenos, edificios y monumentos.",
      icon: "cube",
      deliverables: ["Malla 3D texturizada OBJ/FBX/GLTF", "Nube de puntos LAS", "Ortofoto GeoTIFF"],
      precision: { gsd: "0.5-3cm", horizontalAccuracy: "+-2cm", verticalAccuracy: "+-3cm" },
      useCases: ["Arquitectura", "Arqueologia", "Mineria", "Topografia", "Videojuegos"],
      pricing: { from: 18000, currency: "MXN", unit: "hectarea" },
      tags: ["fotogrametria", "3d", "modelado", "topografia", "bim"],
      order: 6
    },
    {
      id: "svc-007", slug: "fpv-cinematografico",
      name: "FPV Cinematografico",
      category: "cine",
      description: "Tomas FPV de alto impacto. Persecuciones, vuelos rasantes, interiores imposibles.",
      icon: "rocket",
      deliverables: ["Archivos 4K-5.3K estabilizados", "Gyroflow stabilization", "Camara lenta 240fps"],
      drones: [
        { model: "Custom 5 inch FPV", speed: "140 km/h", camera: "GoPro Hero 12", use: "Persecuciones exteriores" },
        { model: "Custom 3 inch Cinewhoop", speed: "80 km/h", camera: "GoPro Hero 12", use: "Interiores amplios" },
        { model: "Custom Tinywhoop", speed: "40 km/h", camera: "Caddx Vista", use: "Interiores reducidos" }
      ],
      useCases: ["Persecuciones de autos", "Interiores", "Vuelos rasantes", "Follow-me extremo"],
      pricing: { from: 25000, currency: "MXN", unit: "toma" },
      tags: ["fpv", "accion", "persecucion", "interiores", "alta-velocidad"],
      featuredProject: "proj-003", order: 7
    },
    {
      id: "svc-008", slug: "capacitacion-pilotos",
      name: "Capacitacion para Pilotos",
      category: "education",
      description: "Cursos de pilotaje de drones cinematograficos. Certificacion DGAC/FAA.",
      icon: "graduation",
      courses: [
        { name: "Iniciacion Vuelo Cinematografico", duration: "40h", level: "principiante", price: 18000 },
        { name: "Pilotaje Cinematografico Avanzado", duration: "60h", level: "intermedio", price: 35000 },
        { name: "FPV para Cine y Publicidad", duration: "40h", level: "avanzado", price: 28000 },
        { name: "Certificacion DGAC Piloto Comercial", duration: "100h", level: "profesional", price: 55000 }
      ],
      tags: ["capacitacion", "cursos", "pilotos", "certificacion"],
      order: 8
    }
  ],

  portfolio: {
    total: 2840,
    featured: ["proj-001", "proj-002", "proj-003", "proj-004", "proj-005", "proj-006", "proj-007", "proj-008", "proj-009", "proj-010"],
    categories: [
      { id: "cat-cine", name: "Cine", count: 124, icon: "clapperboard" },
      { id: "cat-commercial", name: "Publicidad", count: 890, icon: "megaphone" },
      { id: "cat-documentary", name: "Documental", count: 215, icon: "globe" },
      { id: "cat-broadcast", name: "TV / Broadcast", count: 450, icon: "tv" },
      { id: "cat-corporate", name: "Corporativo", count: 620, icon: "building" },
      { id: "cat-sports", name: "Deportes", count: 340, icon: "trophy" },
      { id: "cat-realestate", name: "Bienes Raices", count: 180, icon: "home" },
      { id: "cat-industrial", name: "Industrial", count: 21, icon: "gear" }
    ],
    projects: [
      {
        id: "proj-001", title: "Cielo Abierto", subtitle: "Largometraje - Drama Familiar",
        type: "feature-film", category: "cat-cine", year: 2026,
        status: "completed", releaseDate: "2026-09-15",
        client: { id: "cli-001", name: "Netflix" },
        director: "Guillermo del Toro", dp: "Alejandro Mendoza", pilot: "usr-001", editor: "usr-005",
        synopsis: "Una historia sobre migracion vista desde el aire. Tomas aereas que siguen a los personajes a traves de desiertos, ciudades y fronteras.",
        duration: { seconds: 7140, display: "1h 59min" },
        droneTime: { hours: 6, percentage: 18 },
        masterFormat: "ARRIRAW 4.6K",
        media: {
          poster: "/assets/portfolio/cielo-abierto/poster.jpg",
          posterThumb: "/assets/portfolio/cielo-abierto/poster-thumb.jpg",
          trailer: "/assets/portfolio/cielo-abierto/trailer.mp4",
          thumbnail: "/assets/portfolio/cielo-abierto/thumb.jpg",
          gallery: [
            { src: "/assets/portfolio/cielo-abierto/gallery-01.jpg", alt: "Toma aerea del desierto", caption: "Atardecer en el desierto de Sonora" },
            { src: "/assets/portfolio/cielo-abierto/gallery-02.jpg", alt: "Ciudad desde arriba", caption: "Llegada a la ciudad" },
            { src: "/assets/portfolio/cielo-abierto/gallery-03.jpg", alt: "Persecucion nocturna", caption: "Persecucion en azoteas" },
            { src: "/assets/portfolio/cielo-abierto/gallery-04.jpg", alt: "Campo agricola", caption: "Campos de cultivo" },
            { src: "/assets/portfolio/cielo-abierto/gallery-05.jpg", alt: "Frontera", caption: "El muro fronterizo desde 500m" },
            { src: "/assets/portfolio/cielo-abierto/gallery-06.jpg", alt: "Familia", caption: "Reunion familiar" }
          ],
          behindTheScenes: [
            { src: "/assets/portfolio/cielo-abierto/bts-01.jpg", caption: "Preparando el Alta X con ARRI ALEXA 35" },
            { src: "/assets/portfolio/cielo-abierto/bts-02.jpg", caption: "Alejandro Mendoza revisando ruta de vuelo" }
          ]
        },
        technicalDetails: { camera: "ARRI ALEXA 35", drone: "Freefly Alta X", lens: "ARRI Signature Prime 35mm" },
        awards: [
          { festival: "Festival de Cine de Morelia", year: 2026, category: "Mejor Fotografia", result: "Ganador" }
        ],
        testimonials: [{ person: "Guillermo del Toro", role: "Director", quote: "Sus tomas aereas no son solo bonitas: cuentan la historia.", rating: 5 }],
        featured: true, priority: 1,
        tags: ["largometraje", "drama", "netflix", "migracion", "guillermo-del-toro"]
      },
      {
        id: "proj-002", title: "Velocidad Pura", subtitle: "Comercial - Automotriz",
        type: "commercial", category: "cat-commercial", year: 2026,
        status: "completed", releaseDate: "2026-03-20",
        client: { id: "cli-002", name: "Porsche Latin America" },
        dp: "Mariana Garcia", pilot: "usr-002", editor: "usr-005",
        synopsis: "Lanzamiento del Porsche 911 GT3 RS en Latinoamerica. Tomas aereas de persecucion a 260km/h.",
        duration: { seconds: 120, display: "2min" },
        droneTime: { hours: 4, percentage: 100 },
        masterFormat: "ProRes RAW 6K",
        media: {
          poster: "/assets/portfolio/velocidad-pura/poster.jpg",
          video: "/assets/portfolio/velocidad-pura/spot-final.mp4",
          thumbnail: "/assets/portfolio/velocidad-pura/thumb.jpg",
          gallery: [
            { src: "/assets/portfolio/velocidad-pura/gallery-01.jpg", alt: "Persecucion en curva", caption: "Toma FPV a 200km/h" },
            { src: "/assets/portfolio/velocidad-pura/gallery-02.jpg", alt: "Vista cenital", caption: "Apertura - vista 360" },
            { src: "/assets/portfolio/velocidad-pura/gallery-03.jpg", alt: "Interior", caption: "Interior desde dron cinewhoop" }
          ]
        },
        technicalDetails: { camera: "RED V-RAPTOR XL", drone: "DJI Inspire 3 + Custom FPV", maxSpeed: 72 },
        awards: [
          { festival: "Cannes Lions", year: 2026, category: "Film Craft", result: "Shortlist" },
          { festival: "ADC Awards", year: 2026, category: "Direction", result: "Gold" }
        ],
        featured: true, priority: 2,
        tags: ["publicidad", "automotriz", "porsche", "alta-velocidad", "fpv"]
      },
      {
        id: "proj-003", title: "Sabor del Valle", subtitle: "Comercial - Bebidas",
        type: "commercial", category: "cat-commercial", year: 2026,
        status: "completed", releaseDate: "2026-05-10",
        client: { id: "cli-003", name: "Jose Cuervo" },
        director: "Alejandro Gonzalez Inarritu", dp: "Mariana Garcia", pilot: "usr-003",
        synopsis: "Recorrido aereo por los campos de agave azul en Jalisco. Una sola toma continua de 3 minutos.",
        duration: { seconds: 180, display: "3min" },
        masterFormat: "ProRes RAW 6K",
        media: {
          poster: "/assets/portfolio/sabor-del-valle/poster.jpg",
          video: "/assets/portfolio/sabor-del-valle/spot.mp4",
          thumbnail: "/assets/portfolio/sabor-del-valle/thumb.jpg",
          gallery: [
            { src: "/assets/portfolio/sabor-del-valle/gallery-01.jpg", alt: "Campos de agave", caption: "Amanecer sobre agave azul" },
            { src: "/assets/portfolio/sabor-del-valle/gallery-02.jpg", alt: "Destileria", caption: "Interior de destileria tradicional" },
            { src: "/assets/portfolio/sabor-del-valle/gallery-03.jpg", alt: "Barricas", caption: "Bodega de anejamiento" }
          ]
        },
        featured: true, priority: 3,
        tags: ["publicidad", "bebidas", "tequila", "plano-secuencia", "jalisco"]
      },
      {
        id: "proj-004", title: "Raices del Mayab", subtitle: "Documental - Serie Netflix",
        type: "documentary", category: "cat-documentary", year: 2025,
        status: "completed", releaseDate: "2025-11-20",
        client: { id: "cli-001", name: "Netflix" },
        dp: "Alejandro Mendoza", pilot: "usr-001", editor: "usr-005",
        synopsis: "Serie documental de 4 episodios sobre la cultura maya contemporanea.",
        duration: { seconds: 14400, display: "4 episodios x 1h" },
        droneTime: { hours: 28, percentage: 35 },
        masterFormat: "ProRes RAW 5.1K",
        media: {
          poster: "/assets/portfolio/raices-mayab/poster.jpg",
          trailer: "/assets/portfolio/raices-mayab/trailer.mp4",
          thumbnail: "/assets/portfolio/raices-mayab/thumb.jpg",
          gallery: [
            { src: "/assets/portfolio/raices-mayab/gallery-01.jpg", alt: "Chichen Itza", caption: "Kukulkan al amanecer" },
            { src: "/assets/portfolio/raices-mayab/gallery-02.jpg", alt: "Calakmul", caption: "Calakmul emergiendo de la niebla" },
            { src: "/assets/portfolio/raices-mayab/gallery-03.jpg", alt: "Cenote", caption: "Cenote sagrado" },
            { src: "/assets/portfolio/raices-mayab/gallery-04.jpg", alt: "Comunidad", caption: "Comunidad maya actual" }
          ]
        },
        awards: [
          { festival: "Premios Emmy Internacional", year: 2026, category: "Mejor Serie Documental", result: "Ganador" },
          { festival: "Canneseries", year: 2026, category: "Mejor Documental", result: "Seleccion Oficial" }
        ],
        featured: true, priority: 4,
        tags: ["documental", "netflix", "maya", "naturaleza", "serie", "emmy"]
      },
      {
        id: "proj-005", title: "Formula 1 - Gran Premio CDMX", subtitle: "Broadcast - Deportes",
        type: "broadcast", category: "cat-sports", year: 2025,
        status: "completed", releaseDate: "2025-10-26",
        client: { id: "cli-004", name: "Formula 1" },
        dp: "Mariana Garcia", pilot: "usr-002",
        synopsis: "Cobertura aerea en vivo del Gran Premio de Mexico. 3 drones sincronizados.",
        duration: { display: "Transmision en vivo de 4h" },
        masterFormat: "UHD 4K HDR HLG",
        media: {
          poster: "/assets/portfolio/f1-cdmx/poster.jpg",
          highlight: "/assets/portfolio/f1-cdmx/highlights.mp4",
          thumbnail: "/assets/portfolio/f1-cdmx/thumb.jpg",
          gallery: [
            { src: "/assets/portfolio/f1-cdmx/gallery-01.jpg", alt: "Carrera", caption: "Saliendo de la curva 1" },
            { src: "/assets/portfolio/f1-cdmx/gallery-02.jpg", alt: "Pits", caption: "Vista cenital de boxes" },
            { src: "/assets/portfolio/f1-cdmx/gallery-03.jpg", alt: "Estadio", caption: "Estadio GNP desde el aire" }
          ]
        },
        featured: true, priority: 5,
        tags: ["deportes", "f1", "en-vivo", "broadcast", "cdmx"]
      },
      {
        id: "proj-006", title: "Luz de Estadio", subtitle: "Concierto - Live Stream",
        type: "broadcast", category: "cat-broadcast", year: 2025,
        status: "completed", releaseDate: "2025-09-15",
        client: { id: "cli-005", name: "Live Nation" },
        artist: "Grupo Frontera", pilot: "usr-003",
        synopsis: "Transmision mundial del concierto de Grupo Frontera desde el Estadio Azteca.",
        duration: { seconds: 7200, display: "2h de transmision" },
        media: {
          poster: "/assets/portfolio/luz-de-estadio/poster.jpg",
          highlight: "/assets/portfolio/luz-de-estadio/highlights.mp4",
          thumbnail: "/assets/portfolio/luz-de-estadio/thumb.jpg",
          gallery: [
            { src: "/assets/portfolio/luz-de-estadio/gallery-01.jpg", alt: "Estadio lleno", caption: "Vista aerea del Azteca" },
            { src: "/assets/portfolio/luz-de-estadio/gallery-02.jpg", alt: "Luces", caption: "Coreografia LED cenital" },
            { src: "/assets/portfolio/luz-de-estadio/gallery-03.jpg", alt: "Escenario", caption: "Dron FPV sobrevolando el escenario" }
          ]
        },
        featured: true, priority: 6,
        tags: ["concierto", "en-vivo", "streaming", "live-nation", "estadio"]
      },
      {
        id: "proj-007", title: "Volcan Vivo", subtitle: "Documental - Largometraje",
        type: "documentary", category: "cat-documentary", year: 2025,
        status: "completed", releaseDate: "2025-04-22",
        client: { id: "cli-006", name: "BBC Earth" },
        narration: "David Attenborough", dp: "Alejandro Mendoza", pilot: "usr-001",
        synopsis: "Documental sobre el Volcan Popocatepetl. Vuelos de aproximacion al crater activo.",
        duration: { seconds: 4680, display: "1h 18min" },
        droneTime: { hours: 9, percentage: 45 },
        masterFormat: "ProRes RAW 4.6K",
        media: {
          poster: "/assets/portfolio/volcan-vivo/poster.jpg",
          trailer: "/assets/portfolio/volcan-vivo/trailer.mp4",
          thumbnail: "/assets/portfolio/volcan-vivo/thumb.jpg",
          gallery: [
            { src: "/assets/portfolio/volcan-vivo/gallery-01.jpg", alt: "Crateer", caption: "Crateer activo - termografia" },
            { src: "/assets/portfolio/volcan-vivo/gallery-02.jpg", alt: "Lava", caption: "Lava incandescente desde 200m" },
            { src: "/assets/portfolio/volcan-vivo/gallery-03.jpg", alt: "Expedicion", caption: "Campamento base" }
          ]
        },
        awards: [{ festival: "Wildscreen Festival", year: 2025, category: "Mejor Fotografia Extremos", result: "Ganador" }],
        featured: true, priority: 7,
        tags: ["documental", "naturaleza", "volcan", "bbc", "condiciones-extremas"]
      },
      {
        id: "proj-008", title: "Reserva del Jaguar", subtitle: "Documental - Conservacion",
        type: "documentary", category: "cat-documentary", year: 2024,
        status: "completed", releaseDate: "2024-12-10",
        client: { id: "cli-007", name: "WWF Mexico" },
        dp: "Mariana Garcia", pilot: "usr-002",
        synopsis: "Monitoreo aereo de la poblacion de jaguares en Calakmul. Drones silenciosos y camaras termicas.",
        duration: { seconds: 3120, display: "52min" },
        masterFormat: "4K UHD",
        media: {
          poster: "/assets/portfolio/reserva-jaguar/poster.jpg",
          video: "/assets/portfolio/reserva-jaguar/documental.mp4",
          thumbnail: "/assets/portfolio/reserva-jaguar/thumb.jpg",
          gallery: [
            { src: "/assets/portfolio/reserva-jaguar/gallery-01.jpg", alt: "Jaguar", caption: "Jaguar en camara termica nocturna" },
            { src: "/assets/portfolio/reserva-jaguar/gallery-02.jpg", alt: "Selva", caption: "Dosel de la selva al amanecer" },
            { src: "/assets/portfolio/reserva-jaguar/gallery-03.jpg", alt: "Equipo", caption: "Equipo de monitoreo en campo" }
          ]
        },
        featured: true, priority: 8,
        tags: ["documental", "conservacion", "fauna", "jaguar", "wwf"]
      },
      {
        id: "proj-009", title: "Arquitectura del Silencio", subtitle: "Branded Content - Luis Barragan",
        type: "branded", category: "cat-corporate", year: 2024,
        status: "completed", releaseDate: "2024-08-15",
        client: { id: "cli-008", name: "Fundacion Barragan" },
        dp: "Carlos Ruiz", pilot: "usr-003",
        synopsis: "Cortometraje sobre las obras de Luis Barragan filmadas desde angulos aereos imposibles.",
        duration: { seconds: 480, display: "8min" },
        masterFormat: "ProRes RAW 6K",
        media: {
          poster: "/assets/portfolio/arquitectura-silencio/poster.jpg",
          video: "/assets/portfolio/arquitectura-silencio/corto.mp4",
          thumbnail: "/assets/portfolio/arquitectura-silencio/thumb.jpg",
          gallery: [
            { src: "/assets/portfolio/arquitectura-silencio/gallery-01.jpg", alt: "Casa Barragan", caption: "Interior FPV a 30cm del muro" },
            { src: "/assets/portfolio/arquitectura-silencio/gallery-02.jpg", alt: "Torres Satelite", caption: "Torres de Satelite" },
            { src: "/assets/portfolio/arquitectura-silencio/gallery-03.jpg", alt: "Cuadra San Cristobal", caption: "Fuente y caballos" }
          ]
        },
        awards: [
          { festival: "ArchDaily Film Festival", year: 2025, category: "Mejor Cortometraje", result: "Ganador" }
        ],
        featured: true, priority: 9,
        tags: ["arquitectura", "barragan", "fpv", "cortometraje", "interiores"]
      },
      {
        id: "proj-010", title: "Raices del Tequila", subtitle: "Documental - Serie Apple TV+",
        type: "documentary", category: "cat-documentary", year: 2024,
        status: "completed", releaseDate: "2024-06-05",
        client: { id: "cli-009", name: "Apple TV+" },
        dp: "Alejandro Mendoza", pilot: "usr-001",
        synopsis: "Serie documental de 6 episodios sobre la tradicion tequilera.",
        duration: { seconds: 21600, display: "6 episodios x 1h" },
        droneTime: { hours: 20, percentage: 30 },
        masterFormat: "ProRes RAW 5.1K",
        media: {
          poster: "/assets/portfolio/raices-tequila/poster.jpg",
          trailer: "/assets/portfolio/raices-tequila/trailer.mp4",
          thumbnail: "/assets/portfolio/raices-tequila/thumb.jpg",
          gallery: [
            { src: "/assets/portfolio/raices-tequila/gallery-01.jpg", alt: "Agave", caption: "Campos de agave azul" },
            { src: "/assets/portfolio/raices-tequila/gallery-02.jpg", alt: "Jimadores", caption: "Jimadores cortando agave" },
            { src: "/assets/portfolio/raices-tequila/gallery-03.jpg", alt: "Destileria", caption: "Destileria tradicional" },
            { src: "/assets/portfolio/raices-tequila/gallery-04.jpg", alt: "Barricas", caption: "Bodega de anejamiento" }
          ]
        },
        awards: [{ festival: "Premios Emmy Internacional", year: 2025, category: "Mejor Serie Documental", result: "Nominado" }],
        featured: true, priority: 10,
        tags: ["documental", "tequila", "apple-tv", "serie", "tradicion"]
      }
    ]
  },

  clients: [
    { id: "cli-001", name: "Netflix", slug: "netflix", industry: "Streaming / Entretenimiento", logo: "/assets/clients/netflix.svg", since: 2021, projectsCount: 8, featuredProjects: ["proj-001", "proj-004"], relationshipType: "strategic" },
    { id: "cli-002", name: "Porsche Latin America", slug: "porsche", industry: "Automotriz", logo: "/assets/clients/porsche.svg", since: 2024, projectsCount: 3, featuredProjects: ["proj-002"], relationshipType: "preferred" },
    { id: "cli-003", name: "Jose Cuervo", slug: "jose-cuervo", industry: "Bebidas", logo: "/assets/clients/cuervo.svg", since: 2023, projectsCount: 5, featuredProjects: ["proj-003"], relationshipType: "active" },
    { id: "cli-004", name: "Formula 1", slug: "formula-1", industry: "Deportes / Automovilismo", logo: "/assets/clients/f1.svg", since: 2024, projectsCount: 2, featuredProjects: ["proj-005"], relationshipType: "strategic" },
    { id: "cli-005", name: "Live Nation", slug: "live-nation", industry: "Entretenimiento / Musica", logo: "/assets/clients/live-nation.svg", since: 2024, projectsCount: 6, featuredProjects: ["proj-006"], relationshipType: "active" },
    { id: "cli-006", name: "BBC Earth", slug: "bbc-earth", industry: "Medios / Documentales", logo: "/assets/clients/bbc-earth.svg", since: 2024, projectsCount: 1, featuredProjects: ["proj-007"], relationshipType: "preferred" },
    { id: "cli-007", name: "WWF Mexico", slug: "wwf-mexico", industry: "Conservacion / ONG", logo: "/assets/clients/wwf.svg", since: 2022, projectsCount: 4, featuredProjects: ["proj-008"], relationshipType: "pro-bono" },
    { id: "cli-008", name: "Fundacion Barragan", slug: "fundacion-barragan", industry: "Cultura / Arquitectura", logo: "/assets/clients/barragan.svg", since: 2023, projectsCount: 2, featuredProjects: ["proj-009"], relationshipType: "cultural" },
    { id: "cli-009", name: "Apple TV+", slug: "apple-tv", industry: "Streaming", logo: "/assets/clients/apple-tv.svg", since: 2023, projectsCount: 3, featuredProjects: ["proj-010"], relationshipType: "strategic" },
    { id: "cli-010", name: "HBO Latin America", slug: "hbo-latam", industry: "Streaming / TV", logo: "/assets/clients/hbo.svg", since: 2022, projectsCount: 7, relationshipType: "active" },
    { id: "cli-011", name: "Audi Mexico", slug: "audi-mexico", industry: "Automotriz", logo: "/assets/clients/audi.svg", since: 2023, projectsCount: 4, relationshipType: "active" },
    { id: "cli-012", name: "Coca-Cola Mexico", slug: "coca-cola-mx", industry: "Bebidas", logo: "/assets/clients/coca-cola.svg", since: 2024, projectsCount: 2, relationshipType: "one-time" }
  ],

  testimonials: [
    { id: "tst-001", person: "Guillermo del Toro", role: "Director de Cine", photo: "/assets/testimonials/guillermo-del-toro.jpg", quote: "Sus tomas aereas no son solo bonitas: cuentan la historia.", projectId: "proj-001", rating: 5, featured: true },
    { id: "tst-002", person: "Lisa Nishimura", role: "VP Original Documentaries - Netflix", photo: "/assets/testimonials/lisa-nishimura.jpg", quote: "Su precision tecnica y sensibilidad narrativa los distingue.", projectId: "proj-004", rating: 5, featured: true },
    { id: "tst-003", person: "Klaus Zellmer", role: "CEO - Porsche Latin America", photo: "/assets/testimonials/klaus-zellmer.jpg", quote: "Las mejores tomas que hemos tenido en la region.", projectId: "proj-002", rating: 5, featured: true },
    { id: "tst-004", person: "Jonny Keeling", role: "Executive Producer - BBC Natural History", photo: "/assets/testimonials/jonny-keeling.jpg", quote: "Lo que lograron en el Popocatepetl es extraordinario.", projectId: "proj-007", rating: 5, featured: true },
    { id: "tst-005", person: "Ana Paula Garcia", role: "Marketing Director - Live Nation Mexico", photo: "/assets/testimonials/ana-paula-garcia.jpg", quote: "Dronestica transformo la experiencia de nuestro broadcast.", projectId: "proj-006", rating: 5 },
    { id: "tst-006", person: "Diego Luna", role: "Director y Productor", photo: "/assets/testimonials/diego-luna.jpg", quote: "Entienden el lenguaje cinematografico. No solo vuelan: actuan con la camara.", rating: 5 },
    { id: "tst-007", person: "Carlos Lopez", role: "Creative Director - Ogilvy Mexico", photo: "/assets/testimonials/carlos-lopez.jpg", quote: "Para el comercial de Porsche necesitabamos precision y peligro. Lo entregaron.", projectId: "proj-002", rating: 5 },
    { id: "tst-008", person: "Maria del Carmen Rodriguez", role: "Communications Director - WWF Mexico", photo: "/assets/testimonials/maria-rodriguez.jpg", quote: "Los jaguares ni siquiera notaron su presencia.", projectId: "proj-008", rating: 5 }
  ],

  social: {
    links: [
      { platform: "Instagram", handle: "@dronestica", url: "https://instagram.com/dronestica", icon: "instagram", followers: 84700, engagement: 4.8, postsPerWeek: 5 },
      { platform: "Vimeo", handle: "dronestica", url: "https://vimeo.com/dronestica", icon: "vimeo", followers: 12300, postsPerMonth: 4 },
      { platform: "YouTube", handle: "Dronestica", url: "https://youtube.com/@dronestica", icon: "youtube", subscribers: 45200, totalViews: 2800000, postsPerMonth: 6 },
      { platform: "LinkedIn", handle: "Dronestica", url: "https://linkedin.com/company/dronestica", icon: "linkedin", followers: 18200, postsPerWeek: 3 },
      { platform: "TikTok", handle: "@dronestica", url: "https://tiktok.com/@dronestica", icon: "tiktok", followers: 156000, engagement: 12.3, postsPerDay: 1 },
      { platform: "Twitter / X", handle: "@dronestica", url: "https://x.com/dronestica", icon: "x", followers: 8900, postsPerDay: 2 }
    ],
    stats: { totalFollowers: 325300, totalEngagement: 8.2, topPlatform: "TikTok" }
  },

  formats: {
    video: [
      { id: "fmt-001", name: "ARRIRAW", container: "ARI / MXF", codec: "Uncompressed ARRI", bitDepth: 12, chroma: "444", useCase: "Master de cine" },
      { id: "fmt-002", name: "REDCODE RAW", container: "R3D", codec: "RED RAW", bitDepth: 16, chroma: "444", useCase: "Master de cine flexible" },
      { id: "fmt-003", name: "Apple ProRes RAW", container: "MOV", codec: "ProRes RAW", bitDepth: 12, useCase: "Flujo Mac nativo" },
      { id: "fmt-004", name: "Apple ProRes 4444 XQ", container: "MOV", bitDepth: 12, chroma: "4444", useCase: "VFX y composicion" },
      { id: "fmt-005", name: "Apple ProRes 422 HQ", container: "MOV", bitDepth: 10, chroma: "422", useCase: "Broadcast y streaming" },
      { id: "fmt-006", name: "CinemaDNG", container: "DNG sequence", bitDepth: 12, useCase: "RAW frame a frame" },
      { id: "fmt-007", name: "DNxHR 444", container: "MXF", bitDepth: 12, chroma: "444", useCase: "Flujo Avid" },
      { id: "fmt-008", name: "H.265 / HEVC", container: "MP4", bitDepth: 10, useCase: "Distribucion digital" },
      { id: "fmt-009", name: "H.264 / AVC", container: "MP4", bitDepth: 8, useCase: "Formato universal" },
      { id: "fmt-010", name: "WebM VP9", container: "WebM", bitDepth: 10, useCase: "Web optimizado" }
    ],
    audio: [
      { id: "aud-001", name: "Dolby Atmos 7.1.4", channels: 12, sampleRate: 48000, bitDepth: 24 },
      { id: "aud-002", name: "Dolby Digital Plus 5.1", channels: 6, sampleRate: 48000, bitDepth: 24 },
      { id: "aud-003", name: "PCM Stereo 24bit", channels: 2, sampleRate: 48000, bitDepth: 24 },
      { id: "aud-004", name: "AAC Stereo 320kbps", channels: 2, sampleRate: 48000, bitDepth: 16 }
    ],
    image: [
      { id: "img-001", name: "OpenEXR", bitDepth: 32, useCase: "EXR para VFX" },
      { id: "img-002", name: "TIFF 16bit", bitDepth: 16, useCase: "Stills para impresion" },
      { id: "img-003", name: "JPEG 2000", bitDepth: 16, useCase: "DCP" },
      { id: "img-004", name: "PNG", bitDepth: 16, useCase: "Web y transparencias" },
      { id: "img-005", name: "WebP", useCase: "Web optimizado" },
      { id: "img-006", name: "AVIF", useCase: "Web next-gen" },
      { id: "img-007", name: "JPEG", useCase: "Web universal" }
    ],
    resolutions: [
      { name: "8K DCI", width: 8192, height: 4320, ratio: "1.90:1", class: "ultra-hd-cinema" },
      { name: "6K", width: 6144, height: 3160, ratio: "1.94:1", class: "large-format" },
      { name: "5.1K", width: 5120, height: 2700, ratio: "1.90:1", class: "large-format" },
      { name: "4.6K DCI", width: 4608, height: 3164, ratio: "1.46:1", class: "cinema-arri" },
      { name: "4K DCI", width: 4096, height: 2160, ratio: "1.90:1", class: "cinema" },
      { name: "UHD 4K", width: 3840, height: 2160, ratio: "16:9", class: "broadcast" },
      { name: "FHD 1080p", width: 1920, height: 1080, ratio: "16:9", class: "broadcast" },
      { name: "Vertical 4K", width: 2160, height: 3840, ratio: "9:16", class: "social" },
      { name: "Vertical 1080p", width: 1080, height: 1920, ratio: "9:16", class: "social" },
      { name: "Square 1080p", width: 1080, height: 1080, ratio: "1:1", class: "social" }
    ],
    framerates: [
      { fps: 23.976, standard: "Film / Cinema", useCase: "Cine" },
      { fps: 24, standard: "Film / Cinema", useCase: "Cine digital DCP" },
      { fps: 25, standard: "PAL / Broadcast", useCase: "TV europea" },
      { fps: 29.97, standard: "NTSC / Broadcast", useCase: "TV americana" },
      { fps: 30, standard: "Digital / Web", useCase: "Web" },
      { fps: 48, standard: "HFR", useCase: "High Frame Rate" },
      { fps: 60, standard: "Digital HFR", useCase: "Deportes" },
      { fps: 100, standard: "Slow Motion", useCase: "Camara lenta 40%" },
      { fps: 120, standard: "Slow Motion", useCase: "Camara lenta 20%" },
      { fps: 240, standard: "Ultra Slow Motion", useCase: "Camara lenta 10%" }
    ]
  },

  pricing: {
    currency: "MXN", currencySymbol: "$", taxRate: 0.16,
    packages: [
      { id: "pkg-001", name: "Produccion Basica", price: 18000, duration: "4h", includes: ["1 drone", "1 piloto", "Camara 4K", "10 tomas editadas"], popular: false },
      { id: "pkg-002", name: "Produccion Estandar", price: 45000, duration: "8h", includes: ["2 drones", "2 pilotos", "Camara 4K-6K", "Postproduccion basica", "Licencia comercial"], popular: true },
      { id: "pkg-003", name: "Produccion Premium", price: 95000, duration: "12h", includes: ["3 drones", "3 pilotos/DP", "Camara ARRI/RED", "Postproduccion + color", "Seguro"], popular: false },
      { id: "pkg-004", name: "Expedicion", price: 150000, duration: "3 dias", includes: ["Equipo completo", "Logistica", "Comunicacion satelital", "Postproduccion"], requiresConsultation: true, popular: false },
      { id: "pkg-005", name: "Live Broadcast", price: 45000, duration: "4h", includes: ["1-3 drones", "Senial SDI/NDI/RTMP", "Grabacion 4K"], requiresConsultation: true, popular: false }
    ],
    addons: [
      { id: "add-001", name: "Hora adicional de vuelo", price: 3500, unit: "hora" },
      { id: "add-002", name: "Drone FPV adicional", price: 8000, unit: "jornada" },
      { id: "add-003", name: "Camara ARRI ALEXA 35", price: 25000, unit: "jornada" },
      { id: "add-004", name: "Camara RED V-RAPTOR", price: 22000, unit: "jornada" },
      { id: "add-005", name: "Lente cinematico adicional", price: 5000, unit: "jornada" },
      { id: "add-006", name: "Seguro de produccion ampliado", price: 8000, unit: "evento" },
      { id: "add-007", name: "Color grading premium", price: 15000, unit: "proyecto" },
      { id: "add-008", name: "Postproduccion VFX", price: 12000, unit: "dia" },
      { id: "add-009", name: "Entrega urgente (4h)", price: 8000, unit: "proyecto" },
      { id: "add-010", name: "Desplazamiento nacional", price: 8000, unit: "dia" },
      { id: "add-011", name: "Desplazamiento internacional", price: 25000, unit: "dia" },
      { id: "add-012", name: "Licencia de uso extendido", price: 35000, unit: "proyecto" },
      { id: "add-013", name: "Stock footage sin editar", price: 15000, unit: "proyecto" },
      { id: "add-014", name: "Dronist (asistente adicional)", price: 4000, unit: "jornada" }
    ]
  },

  blog: [
    {
      id: "post-001", title: "Como filmamos dentro de un volcan activo", slug: "como-filmamos-dentro-de-un-volcan-activo",
      author: "usr-001", category: "detras-de-camaras", publishedAt: "2026-06-15T10:00:00Z", readTime: 12,
      excerpt: "Detras de camaras de la expedicion al Popocatepetl para BBC Earth.",
      coverImage: "/assets/blog/volcan-activo/cover.jpg", featured: true
    },
    {
      id: "post-002", title: "Guia definitiva de formatos RAW para produccion aerea", slug: "guia-formatos-raw",
      author: "usr-006", category: "tecnica", publishedAt: "2026-05-20T14:00:00Z", readTime: 18,
      excerpt: "ARRIRAW vs ProRes RAW vs CinemaDNG vs REDCODE. Cual elegir.",
      coverImage: "/assets/blog/guia-raw/cover.jpg", featured: false
    },
    {
      id: "post-003", title: "5 tomas aereas que transformaron la publicidad automotriz", slug: "5-tomas-publicidad-automotriz",
      author: "usr-002", category: "industria", publishedAt: "2026-04-10T09:00:00Z", readTime: 10,
      excerpt: "Como el dron cambio para siempre la publicidad de autos.",
      coverImage: "/assets/blog/publicidad-automotriz/cover.jpg", featured: false
    },
    {
      id: "post-004", title: "Nueva flota 2026: Alta X, Inspire 3 y los drones que vienen", slug: "nueva-flota-2026",
      author: "usr-007", category: "equipo", publishedAt: "2026-03-01T11:00:00Z", readTime: 8,
      excerpt: "Renovamos nuestra flota con los drones mas avanzados del mercado.",
      coverImage: "/assets/blog/nueva-flota/cover.jpg", featured: false
    },
    {
      id: "post-005", title: "Entrevista: Mariana Garcia, la mujer que vuela mas rapido que los autos", slug: "entrevista-mariana-garcia",
      author: "usr-004", category: "cultura", publishedAt: "2026-02-14T15:00:00Z", readTime: 15,
      excerpt: "Hablamos con Mariana sobre su carrera y como fue pilotar a 260km/h.",
      coverImage: "/assets/blog/entrevista-mariana/cover.jpg", featured: false
    }
  ],

  awards: [
    { id: "awd-001", name: "Premio Ariel - Mejor Fotografia", year: 2026, projectId: "proj-001", category: "Cine" },
    { id: "awd-002", name: "Cannes Lions - Film Craft Shortlist", year: 2026, projectId: "proj-002", category: "Publicidad" },
    { id: "awd-003", name: "ADC Awards - Gold Direction", year: 2026, projectId: "proj-002", category: "Publicidad" },
    { id: "awd-004", name: "Emmy Internacional - Mejor Serie Documental", year: 2026, projectId: "proj-004", category: "TV" },
    { id: "awd-005", name: "Canneseries - Seleccion Oficial", year: 2026, projectId: "proj-004", category: "TV" },
    { id: "awd-006", name: "Wildscreen - Mejor Fotografia Extremos", year: 2025, projectId: "proj-007", category: "Documental" },
    { id: "awd-007", name: "ArchDaily Film Festival - Mejor Cortometraje", year: 2025, projectId: "proj-009", category: "Arquitectura" },
    { id: "awd-008", name: "World Drone Photography - 1er Lugar", year: 2024, winner: "Mariana Garcia", category: "Fotografia" },
    { id: "awd-009", name: "DJI Women in Drone Tech Grant", year: 2023, winner: "Mariana Garcia", category: "Industria" },
    { id: "awd-010", name: "Camerimage - Nominacion", year: 2026, projectId: "proj-001", category: "Cine" },
    { id: "awd-011", name: "Emmy Internacional - Nominacion Documental", year: 2025, projectId: "proj-010", category: "TV" },
    { id: "awd-012", name: "Casa FOA - Innovacion Visual", year: 2025, projectId: "proj-009", category: "Arquitectura" }
  ],

  locations: [
    { id: "loc-001", name: "Ciudad de Mexico", type: "urban", country: "MX", lat: 19.4326, lng: -99.1332, permitsRequired: true, droneZone: "controlled" },
    { id: "loc-002", name: "Chichen Itza", type: "archeological", country: "MX", lat: 20.6843, lng: -88.5678, permitsRequired: true, droneZone: "restricted" },
    { id: "loc-003", name: "Popocatepetl", type: "natural", country: "MX", lat: 19.0222, lng: -98.6278, permitsRequired: true, droneZone: "restricted" },
    { id: "loc-004", name: "Desierto de Sonora", type: "natural", country: "MX", lat: 32, lng: -113.5, permitsRequired: false, droneZone: "open" },
    { id: "loc-005", name: "Calakmul", type: "natural", country: "MX", lat: 18.5167, lng: -89.7833, permitsRequired: true, droneZone: "restricted" },
    { id: "loc-006", name: "Campos de Agave - Tequila", type: "rural", country: "MX", lat: 20.8833, lng: -103.8333, permitsRequired: false, droneZone: "open" },
    { id: "loc-007", name: "Los Cabos", type: "coastal", country: "MX", lat: 22.8904, lng: -109.9167, permitsRequired: false, droneZone: "open" },
    { id: "loc-008", name: "Los Angeles", type: "urban", country: "US", lat: 34.0522, lng: -118.2437, permitsRequired: true, droneZone: "controlled" },
    { id: "loc-009", name: "Madrid", type: "urban", country: "ES", lat: 40.4168, lng: -3.7038, permitsRequired: true, droneZone: "controlled" },
    { id: "loc-010", name: "Bogota", type: "urban", country: "CO", lat: 4.711, lng: -74.0721, permitsRequired: true, droneZone: "controlled" },
    { id: "loc-011", name: "Selva Lacandona", type: "natural", country: "MX", lat: 16.4833, lng: -90.7833, permitsRequired: true, droneZone: "restricted" },
    { id: "loc-012", name: "Barrancas del Cobre", type: "natural", country: "MX", lat: 27.5167, lng: -107.65, permitsRequired: false, droneZone: "open" }
  ],

  faq: [
    {
      id: "faq-001",
      question: "Que permisos necesitan para volar en zonas urbanas?",
      answer: "Gestionamos todos los permisos ante DGAC (Mexico), FAA (EE.UU.) o EASA (Europa). Cada vuelo requiere un permiso que tramitamos con 5-10 dias habiles de anticipacion.",
      category: "legal"
    },
    {
      id: "faq-002",
      question: "Cuanto tiempo toma entregar el material?",
      answer: "Producciones basicas: 48h. Paquetes premium con postproduccion: 12-24h. Proyectos complejos: calendario de entregas parciales (dailies) durante el rodaje.",
      category: "logistica"
    },
    {
      id: "faq-003",
      question: "Trabajan en zonas de restriccion aerea?",
      answer: "Si. Tenemos acuerdos con autoridades aeronauticas. Hemos volado en conciertos, estadios y zonas arqueologicas. Cada caso requiere permiso especial.",
      category: "legal"
    },
    {
      id: "faq-004",
      question: "Que pasa si llueve el dia del rodaje?",
      answer: "Reprogramamos sin costo si las condiciones no son seguras. Tenemos drones resistentes a lluvia ligera, pero la seguridad es primero.",
      category: "logistica"
    },
    {
      id: "faq-005",
      question: "Tienen seguro de responsabilidad civil?",
      answer: "Si. Contamos con seguro AXA por 50 millones de USD que cubre cualquier eventualidad durante la produccion.",
      category: "legal"
    },
    {
      id: "faq-006",
      question: "Puedo ver las tomas en tiempo real mientras filman?",
      answer: "Si. Proveemos monitoreo en vivo para el director y el equipo creativo. Usamos sistemas de video link de baja latencia (<80ms).",
      category: "tecnica"
    },
    {
      id: "faq-007",
      question: "Que incluye la postproduccion?",
      answer: "Correccion de color basica, sincronizacion de audio, exportacion en formato solicitado, y entrega de dailies. Servicios adicionales como VFX cotizan por separado.",
      category: "servicios"
    },
    {
      id: "faq-008",
      question: "Trabajan con presupuestos pequenos o solo producciones grandes?",
      answer: "Tenemos paquetes desde ,000 MXN hasta producciones multimillonarias. Cada proyecto tiene una solucion a la medida.",
      category: "precios"
    }
  ]
};
