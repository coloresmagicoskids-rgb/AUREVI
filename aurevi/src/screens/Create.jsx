// src/screens/Create.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import CameraRecorder from "../components/CameraRecorder.jsx";

function Create() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState(null); // en dueto = segunda toma
  const [status, setStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // normal | cuento_infantil | mindful | aprendizaje | dueto
  const [cameraMode, setCameraMode] = useState("normal");

  // Categoría / colección
  const [category, setCategory] = useState("otros");

  // Modo de creación: subir archivo o grabar con cámara
  const [mode, setMode] = useState("upload"); // "upload" | "record"

  // Duración de grabación (en segundos)
  const [recordDuration, setRecordDuration] = useState(60); // por defecto 60s

  // URL de previsualización del video (última toma / archivo)
  const [previewUrl, setPreviewUrl] = useState("");

  // Guion rápido (para aprendizajes o lo que quieras)
  const [scriptNotes, setScriptNotes] = useState("");

  // Estado interno para modo dueto (2 tomas)
  const [duetStep, setDuetStep] = useState(1); // 1 = primera toma, 2 = segunda
  const [duetFirstFile, setDuetFirstFile] = useState(null);
  const [duetGroupId, setDuetGroupId] = useState(null);

  // Usuario actual y misión creativa sugerida
  const [currentUser, setCurrentUser] = useState(null);
  const [personalMission, setPersonalMission] = useState(null);

  // ---------- NUEVO: estado visual de pasos ----------
  const hasBasicInfo = title.trim().length > 0;
  const hasVideo = !!videoFile;

  // Paso actual: 1 = info básica, 2 = video, 3 = revisar y publicar
  const currentStep = !hasBasicInfo ? 1 : !hasVideo ? 2 : 3;

  // Helper para traducir el "mood_detected" a texto bonito
  const renderMoodLabel = (mood) => {
    if (!mood) return "No detectado";
    const map = {
      suave: "Suave / tranquilo",
      intenso: "Intenso",
      introspectivo: "Introspectivo",
      jugueton: "Juguetón",
      terapeutico: "Terapéutico",
    };
    return map[mood] || mood;
  };

  // Gestionar URL de previsualización cuando cambia videoFile
  useEffect(() => {
    if (!videoFile) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(videoFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  // Cargar usuario + última misión creativa desde video_analysis
  useEffect(() => {
    async function loadUserAndMission() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          setCurrentUser(null);
          setPersonalMission(null);
          return;
        }

        const user = data.user;
        setCurrentUser(user);

        // Buscamos análisis recientes y filtramos los que sean del usuario
        const { data: rows, error: missionError } = await supabase
          .from("video_analysis")
          .select(
            "mood_detected, advice, created_at, video:video_id(user_id)"
          )
          .order("created_at", { ascending: false })
          .limit(30);

        if (missionError) {
          console.error("Error cargando misión creativa:", missionError);
          setPersonalMission(null);
          return;
        }

        const mine = (rows || []).find(
          (row) => row.video && row.video.user_id === user.id
        );

        if (!mine) {
          setPersonalMission(null);
          return;
        }

        setPersonalMission({
          mood_detected: mine.mood_detected,
          advice: mine.advice,
          created_at: mine.created_at,
        });
      } catch (err) {
        console.error("Error inesperado cargando misión creativa:", err);
        setPersonalMission(null);
      }
    }

    loadUserAndMission();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setVideoFile(file || null);
    setDuetStep(1);
    setDuetFirstFile(null);
    setDuetGroupId(null);
  };

  // Handler que recibe el archivo desde la cámara
  const handleCameraVideoReady = (file) => {
    if (cameraMode === "dueto") {
      // MODO DUETO: gestionamos dos tomas
      if (duetStep === 1) {
        // Primera toma
        const groupId =
          duetGroupId ||
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        setDuetGroupId(groupId);
        setDuetFirstFile(file);
        setVideoFile(file); // previsualizamos la primera toma
        setDuetStep(2);
        setStatus(
          "Primera toma lista. Ahora graba la respuesta (segunda parte del dueto)."
        );
      } else {
        // Segunda toma
        setVideoFile(file); // esta es la que verás al final
        setStatus(
          "Segunda toma lista. Este clip se usará como la parte 2 del dueto."
        );
      }
    } else {
      // MODO NORMAL (no dueto): un solo clip
      setDuetStep(1);
      setDuetFirstFile(null);
      setDuetGroupId(null);
      setVideoFile(file);
      setStatus("Clip listo para subir.");
    }
  };

  // Helper: invocar la función Edge analyze-video para este video
  const analyzeVideo = async (videoId) => {
    if (!videoId) return;
    try {
      setStatus((prev) =>
        prev
          ? prev + " Analizando tu video con el mentor creativo..."
          : "Analizando tu video con el mentor creativo..."
      );

      const { data, error } = await supabase.functions.invoke("analyze-video", {
        body: {
          video_id: videoId,
          // transcript: "opcional, si algún día le pasas texto de transcripción"
        },
      });

      if (error) {
        console.error("Error al invocar analyze-video:", error);
        return;
      }

      console.log("Análisis IA recibido:", data);
      // La función Edge ya guarda en video_analysis.
    } catch (err) {
      console.error("Error inesperado al analizar video:", err);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("");
    setErrorMsg("");

    if (!videoFile) {
      setErrorMsg("Selecciona un archivo de video (o grábalo).");
      return;
    }

    // En modo dueto necesitamos 2 tomas
    if (cameraMode === "dueto" && !duetFirstFile) {
      setErrorMsg("En modo dueto necesitas grabar primero la parte 1.");
      return;
    }

    setLoading(true);

    try {
      // 1) Obtener usuario actual (para user_id)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error obteniendo usuario:", userError);
      }

      if (!user) {
        setErrorMsg("Debes iniciar sesión para subir videos a AUREVI.");
        setLoading(false);
        return;
      }

      // Helper para subir un archivo y crear registro en videos
      // Ahora devuelve el id del video insertado
      const uploadAndInsert = async (
        file,
        duetStepValue = null,
        groupId = null
      ) => {
        // 2) Subir el archivo de video al bucket
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("aurevi-videos")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Error subiendo a Storage:", uploadError);
          throw new Error("No se pudo subir el archivo al servidor.");
        }

        // 3) Obtener URL pública del video
        const { data: publicData } = supabase.storage
          .from("aurevi-videos")
          .getPublicUrl(filePath);

        const publicUrl = publicData?.publicUrl;

        // 4) Insertar fila en la tabla videos
        const payload = {
          title: title || null,
          description: description || null,
          video_url: publicUrl,
          user_id: user.id,
          category: category,
          camera_mode: cameraMode || null,
          notes: scriptNotes || null,
        };

        if (duetStepValue != null) {
          payload.duet_step = duetStepValue;
          payload.duet_group_id =
            groupId ||
            duetGroupId ||
            `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }

        const { data: inserted, error: dbError } = await supabase
          .from("videos")
          .insert(payload)
          .select("id")
          .single();

        if (dbError) {
          console.error(
            "Error guardando metadata en la tabla videos:",
            dbError
          );
          throw new Error(
            dbError.message ||
              "El video se subió, pero no se pudo guardar en la base."
          );
        }

        return inserted.id; // devolvemos el UUID del video
      };

      let mainVideoId = null; // el video principal que analizaremos

      if (cameraMode === "dueto") {
        // Asegurarnos de tener un group id
        const ensuredGroupId =
          duetGroupId ||
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setDuetGroupId(ensuredGroupId);

        // Subimos primero la toma 1 (duet_step = 1)
        const firstId = await uploadAndInsert(
          duetFirstFile,
          1,
          ensuredGroupId
        );
        // Luego la toma 2 (duet_step = 2) => videoFile
        const secondId = await uploadAndInsert(
          videoFile,
          2,
          ensuredGroupId
        );

        // Consideramos la parte 2 como el "clip principal" a analizar
        mainVideoId = secondId;

        setStatus("Dueto subido correctamente a AUREVI.");
      } else {
        // Modos normales: un solo clip
        const singleId = await uploadAndInsert(videoFile, null, null);
        mainVideoId = singleId;
        setStatus("Video subido correctamente a AUREVI.");
      }

      // Lanzar análisis IA para el video principal
      if (mainVideoId) {
        await analyzeVideo(mainVideoId);
      }

      // 5) Resetear formulario
      setTitle("");
      setDescription("");
      setVideoFile(null);
      setPreviewUrl("");
      setScriptNotes("");
      setDuetStep(1);
      setDuetFirstFile(null);
      setDuetGroupId(null);
    } catch (err) {
      console.error("Error inesperado al subir video:", err);
      setErrorMsg(
        err.message || "Ocurrió un error inesperado al subir el video."
      );
    }

    setLoading(false);
  };

  return (
    <section className="aurevi-screen">
      <h2 className="aurevi-screen-title">Crear</h2>
      <p className="aurevi-screen-description">
        Sube tu video o grábalo directamente desde AUREVI.
      </p>

      {/* ---------- NUEVO: barra de pasos visual ---------- */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          fontSize: 12,
        }}
      >
        {[
          { step: 1, label: "Idea y detalles" },
          { step: 2, label: "Video y formato" },
          { step: 3, label: "Revisar y publicar" },
        ].map((s) => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <div
              key={s.step}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.45)",
                background: isActive
                  ? "linear-gradient(120deg,#4f46e5,#0ea5e9)"
                  : isDone
                  ? "rgba(22,163,74,0.2)"
                  : "rgba(15,23,42,0.9)",
                color: "#e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  background: "rgba(15,23,42,0.85)",
                }}
              >
                {isDone ? "✔" : s.step}
              </span>
              <span
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  opacity: isActive ? 1 : 0.8,
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="aurevi-form-card">
        <h3 className="aurevi-form-title">Crear video</h3>

        {/* Bloque: misión creativa sugerida */}
        {personalMission && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 12px",
              borderRadius: 14,
              background: "rgba(15,23,42,0.98)",
              border: "1px solid rgba(148,163,184,0.5)",
              fontSize: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              Misión creativa basada en tus últimos videos
            </div>
            <div
              style={{
                fontSize: 11,
                marginBottom: 3,
                color: "#e5e7eb",
              }}
            >
              Clima detectado en tu estilo reciente:{" "}
              <strong>
                {renderMoodLabel(personalMission.mood_detected)}
              </strong>
            </div>
            {personalMission.advice && (
              <div style={{ color: "#e5e7eb" }}>{personalMission.advice}</div>
            )}
          </div>
        )}

        {/* Toggle de modo: subir archivo / grabar cámara */}
        <div className="profile-mode-toggle" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={
              "profile-mode-btn" + (mode === "upload" ? " active" : "")
            }
            onClick={() => {
              setMode("upload");
              setStatus("");
              setErrorMsg("");
            }}
          >
            Subir archivo
          </button>
          <button
            type="button"
            className={
              "profile-mode-btn" + (mode === "record" ? " active" : "")
            }
            onClick={() => {
              setMode("record");
              setStatus("");
              setErrorMsg("");
            }}
          >
            Grabar con cámara
          </button>
        </div>

        <form className="aurevi-form" onSubmit={handleSubmit}>
          {/* PASO 1: info básica */}
          <label className="aurevi-label">
            Título
            <input
              className="aurevi-input"
              type="text"
              placeholder="Ej: Mi primer video en AUREVI"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="aurevi-label">
            Descripción
            <textarea
              className="aurevi-textarea"
              placeholder="Cuenta brevemente de qué trata tu video."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          {/* Selector de categoría / colección */}
          <label className="aurevi-label">
            Categoría
            <select
              className="aurevi-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="infantil">Infantil</option>
              <option value="aprendizaje">Aprendizaje</option>
              <option value="bienestar">Bienestar</option>
              <option value="musica">Música</option>
              <option value="creatividad">Creatividad</option>
              <option value="otros">Otros</option>
            </select>
          </label>

          {/* PASO 2: video */}
          {/* Modo Subir archivo */}
          {mode === "upload" && (
            <label className="aurevi-label">
              Archivo de video
              <input
                className="aurevi-input"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
              />
              <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                Paso 2 · Elige el archivo que quieres transformar en historia.
              </span>
            </label>
          )}

          {/* Modo Grabar cámara */}
          {mode === "record" && (
            <div className="aurevi-label">
              <span>Grabar desde tu cámara</span>

              {/* Tipo de video: micro / corto / largo / sin límite */}
              <div
                style={{
                  margin: "8px 0 12px",
                  fontSize: 12,
                  color: "#e5e7eb",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span style={{ opacity: 0.9 }}>Tipo de video:</span>

                <button
                  type="button"
                  onClick={() => setRecordDuration(15)}
                  style={{
                    borderRadius: 999,
                    border: "none",
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    background:
                      recordDuration === 15
                        ? "#4f46e5"
                        : "rgba(55,65,81,0.8)",
                    color: "#fff",
                  }}
                >
                  Micro (15s)
                </button>

                <button
                  type="button"
                  onClick={() => setRecordDuration(60)}
                  style={{
                    borderRadius: 999,
                    border: "none",
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    background:
                      recordDuration === 60
                        ? "#4f46e5"
                        : "rgba(55,65,81,0.8)",
                    color: "#fff",
                  }}
                >
                  Corto (60s)
                </button>

                <button
                  type="button"
                  onClick={() => setRecordDuration(180)}
                  style={{
                    borderRadius: 999,
                    border: "none",
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    background:
                      recordDuration === 180
                        ? "#4f46e5"
                        : "rgba(55,65,81,0.8)",
                    color: "#fff",
                  }}
                >
                  Largo (3min)
                </button>

                <button
                  type="button"
                  onClick={() => setRecordDuration(0)} // 0 = sin límite
                  style={{
                    borderRadius: 999,
                    border: "none",
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    background:
                      recordDuration === 0
                        ? "#4f46e5"
                        : "rgba(55,65,81,0.8)",
                    color: "#fff",
                  }}
                >
                  Sin límite*
                </button>
              </div>

              {/* Modo creativo de cámara */}
              <div
                style={{
                  margin: "4px 0 12px",
                  fontSize: 12,
                  color: "#e5e7eb",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span style={{ opacity: 0.9 }}>Modo creativo:</span>

                <button
                  type="button"
                  onClick={() => {
                    setCameraMode("normal");
                    setDuetStep(1);
                    setDuetFirstFile(null);
                    setDuetGroupId(null);
                  }}
                  style={{
                    borderRadius: 999,
                    border: "none",
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    background:
                      cameraMode === "normal"
                        ? "#4f46e5"
                        : "rgba(55,65,81,0.8)",
                    color: "#fff",
                  }}
                >
                  Normal
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCameraMode("cuento_infantil");
                    setDuetStep(1);
                    setDuetFirstFile(null);
                    setDuetGroupId(null);
                  }}
                  style={{
                    borderRadius: 999,
                    border: "none",
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    background:
                      cameraMode === "cuento_infantil"
                        ? "linear-gradient(120deg,#fbbf24,#ec4899)"
                        : "rgba(55,65,81,0.8)",
                    color: "#fff",
                  }}
                >
                  Cuento infantil
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCameraMode("mindful");
                    setDuetStep(1);
                    setDuetFirstFile(null);
                    setDuetGroupId(null);
                  }}
                  style={{
                    borderRadius: 999,
                    border: "none",
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    background:
                      cameraMode === "mindful"
                        ? "linear-gradient(120deg,#22c55e,#0ea5e9)"
                        : "rgba(55,65,81,0.8)",
                    color: "#fff",
                  }}
                >
                  Mindful
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCameraMode("aprendizaje");
                    setDuetStep(1);
                    setDuetFirstFile(null);
                    setDuetGroupId(null);
                  }}
                  style={{
                    borderRadius: 999,
                    border: "none",
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    background:
                      cameraMode === "aprendizaje"
                        ? "linear-gradient(120deg,#6366f1,#0ea5e9)"
                        : "rgba(55,65,81,0.8)",
                    color: "#fff",
                  }}
                >
                  Aprendizajes
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCameraMode("dueto");
                    setDuetStep(1);
                    setDuetFirstFile(null);
                    setDuetGroupId(null);
                  }}
                  style={{
                    borderRadius: 999,
                    border: "none",
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                    background:
                      cameraMode === "dueto"
                        ? "linear-gradient(120deg,#f97316,#60a5fa)"
                        : "rgba(55,65,81,0.8)",
                    color: "#fff",
                  }}
                >
                  Dueto emocional
                </button>
              </div>

              {/* Mensaje de pasos cuando estás en modo dueto */}
              {cameraMode === "dueto" && (
                <>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginBottom: 4,
                    }}
                  >
                    Dueto – paso {duetStep} de 2 ·{" "}
                    {duetStep === 1
                      ? "graba la versión 'del pasado'."
                      : "ahora graba la respuesta 'del futuro'."}
                  </p>
                  {personalMission && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "#e5e7eb",
                        marginBottom: 6,
                        opacity: 0.9,
                      }}
                    >
                      Tip del mentor creativo para este dueto:{" "}
                      <em>{personalMission.advice}</em>
                    </p>
                  )}
                </>
              )}

              {/* Cámara temática */}
              <CameraRecorder
                onVideoReady={handleCameraVideoReady}
                maxDurationSec={recordDuration}
                themeMode={cameraMode}
              />

              {/* Guion rápido solo en modo aprendizajes */}
              {cameraMode === "aprendizaje" && (
                <div style={{ marginTop: 10 }}>
                  {personalMission && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "#e5e7eb",
                        marginBottom: 4,
                      }}
                    >
                      Sugerencia para este clip de aprendizaje:{" "}
                      <em>{personalMission.advice}</em>
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginBottom: 4,
                    }}
                  >
                    Borrador rápido de guion (solo para ti por ahora):
                  </p>
                  <textarea
                    className="aurevi-textarea"
                    rows={3}
                    placeholder="Ej: Paso 1 – contexto breve. Paso 2 – ejemplo. Paso 3 – resumen."
                    value={scriptNotes}
                    onChange={(e) => setScriptNotes(e.target.value)}
                  />
                </div>
              )}

              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                *Los videos muy largos pueden superar el tamaño máximo permitido
                en el servidor. Se recomienda mantenerlos cortos.
              </p>
            </div>
          )}

          {/* PASO 3: previsualización y revisión */}
          {videoFile && previewUrl && (
            <div className="aurevi-label">
              <span>Previsualización del clip</span>
              <video
                src={previewUrl}
                className="aurevi-video-player"
                controls
                style={{ marginTop: 8, maxHeight: 260 }}
              />
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  fontSize: 12,
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  className="aurevi-camera-btn-secondary"
                  onClick={() => {
                    setVideoFile(null);
                    setDuetStep(1);
                    setDuetFirstFile(null);
                    setDuetGroupId(null);
                  }}
                >
                  Volver a grabar / elegir otro
                </button>
                <span style={{ color: "#9ca3af" }}>
                  Si te gusta cómo quedó, pulsa “Subir video”.
                </span>
              </div>
            </div>
          )}

          {/* Resumen rápido del clip */}
          <div
            style={{
              marginTop: 10,
              marginBottom: 8,
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.4)",
              background: "rgba(15,23,42,0.9)",
              fontSize: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              Ficha del clip
            </div>
            <p style={{ margin: 0, color: "#e5e7eb" }}>
              <strong>Título:</strong>{" "}
              {title.trim() || "Aún no has escrito el título."}
            </p>
            <p style={{ margin: "2px 0 0", color: "#e5e7eb" }}>
              <strong>Categoría:</strong> {category}
            </p>
            <p style={{ margin: "2px 0 0", color: "#e5e7eb" }}>
              <strong>Modo cámara:</strong>{" "}
              {cameraMode === "normal"
                ? "Normal"
                : cameraMode === "cuento_infantil"
                ? "Cuento infantil"
                : cameraMode === "mindful"
                ? "Mindful"
                : cameraMode === "aprendizaje"
                ? "Aprendizajes"
                : cameraMode === "dueto"
                ? "Dueto emocional"
                : cameraMode}
            </p>
            <p style={{ margin: "2px 0 0", color: "#e5e7eb" }}>
              <strong>Estado:</strong>{" "}
              {!hasBasicInfo
                ? "Completa el título y la categoría."
                : !hasVideo
                ? "Falta elegir o grabar el video."
                : "Listo para publicar."}
            </p>
          </div>

          {status && (
            <p style={{ color: "#4ade80", fontSize: 14, marginTop: 4 }}>
              {status}
            </p>
          )}
          {errorMsg && (
            <p style={{ color: "#fca5a5", fontSize: 14, marginTop: 4 }}>
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="aurevi-primary-btn"
            disabled={loading}
          >
            {loading ? "Subiendo..." : "Subir video"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Create;