import { useState, useRef, type CSSProperties } from "react";
import Header from "../components/Header";

type CardTheme = {
  bgGradient: string;
  barGradient: string;
  accent: string;
  accentLight: string;
  accentBg: string;
  textName: string;
  textFct1: string;
  textFct2: string;
  badgeGradient: string;
  decoColor: string;
};

const THEMES: Record<number, CardTheme> = {
  1: {
    bgGradient: "linear-gradient(160deg, #eef4ff 0%, #ffffff 50%, #dbeafe 100%)",
    barGradient: "linear-gradient(90deg, #3b5998, #87cefa, #3b5998)",
    accent: "#3b5998",
    accentLight: "#87cefa",
    accentBg: "linear-gradient(135deg, #eef4ff, #dbeafe)",
    textName: "#1e3a5f",
    textFct1: "#3b5998",
    textFct2: "#1e40af",
    badgeGradient: "linear-gradient(135deg, #3b5998, #87cefa)",
    decoColor: "rgba(59,89,152,0.09)",
  },
  2: {
    bgGradient: "linear-gradient(160deg, #fff8f0 0%, #ffffff 50%, #fff3e8 100%)",
    barGradient: "linear-gradient(90deg, #ffc864, #ff4500, #ffc864)",
    accent: "#ea6c0a",
    accentLight: "#ffedd5",
    accentBg: "linear-gradient(135deg, #fff7ed, #ffedd5)",
    textName: "#9a3412",
    textFct1: "#ea6c0a",
    textFct2: "#374151",
    badgeGradient: "linear-gradient(135deg, #f97316, #fbbf24)",
    decoColor: "rgba(249,115,22,0.09)",
  },
  3: {
    bgGradient: "linear-gradient(160deg, #f0fdf4 0%, #ffffff 50%, #dcfce7 100%)",
    barGradient: "linear-gradient(90deg, #006400, #90ee90, #006400)",
    accent: "#15803d",
    accentLight: "#bbf7d0",
    accentBg: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
    textName: "#1e3a5f",
    textFct1: "#15803d",
    textFct2: "#166534",
    badgeGradient: "linear-gradient(135deg, #15803d, #90ee90)",
    decoColor: "rgba(0,100,0,0.09)",
  },
  4: {
    bgGradient: "linear-gradient(160deg, #f0fdf4 0%, #ffffff 50%, #dcfce7 100%)",
    barGradient: "linear-gradient(90deg, #006400, #90ee90, #006400)",
    accent: "#15803d",
    accentLight: "#bbf7d0",
    accentBg: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
    textName: "#14532d",
    textFct1: "#15803d",
    textFct2: "#2563eb",
    badgeGradient: "linear-gradient(135deg, #15803d, #90ee90)",
    decoColor: "rgba(0,100,0,0.09)",
  },
  5: {
    bgGradient: "linear-gradient(160deg, #faf5ff 0%, #ffffff 50%, #f3e8ff 100%)",
    barGradient: "linear-gradient(90deg, #8e2de2, #4a00e0, #8e2de2)",
    accent: "#7c3aed",
    accentLight: "#e9d5ff",
    accentBg: "linear-gradient(135deg, #faf5ff, #e9d5ff)",
    textName: "#14532d",
    textFct1: "#7c3aed",
    textFct2: "#2563eb",
    badgeGradient: "linear-gradient(135deg, #8e2de2, #4a00e0)",
    decoColor: "rgba(142,45,226,0.09)",
  },
  6: {
    bgGradient: "linear-gradient(160deg, #fef2f2 0%, #ffffff 50%, #fecaca 100%)",
    barGradient: "linear-gradient(90deg, #800020, #dc143c, #800020)",
    accent: "#b91c1c",
    accentLight: "#fecaca",
    accentBg: "linear-gradient(135deg, #fef2f2, #fecaca)",
    textName: "#14532d",
    textFct1: "#b91c1c",
    textFct2: "#dc2626",
    badgeGradient: "linear-gradient(135deg, #800020, #dc143c)",
    decoColor: "rgba(128,0,32,0.09)",
  },
  7: {
    bgGradient: "linear-gradient(160deg, #fef2f2 0%, #ffffff 50%, #fee2e2 100%)",
    barGradient: "linear-gradient(90deg, #ff0000, #ff0000, #ff0000)",
    accent: "#dc2626",
    accentLight: "#fecaca",
    accentBg: "linear-gradient(135deg, #fef2f2, #fee2e2)",
    textName: "#14532d",
    textFct1: "#dc2626",
    textFct2: "#dc2626",
    badgeGradient: "linear-gradient(135deg, #dc2626, #ef4444)",
    decoColor: "rgba(255,0,0,0.09)",
  },
  8: {
    bgGradient: "linear-gradient(160deg, #eff6ff 0%, #ffffff 50%, #bfdbfe 100%)",
    barGradient: "linear-gradient(90deg, #0000ff, #0000ff, #0000ff)",
    accent: "#2563eb",
    accentLight: "#bfdbfe",
    accentBg: "linear-gradient(135deg, #eff6ff, #bfdbfe)",
    textName: "#ea6c0a",
    textFct1: "#2563eb",
    textFct2: "#dc2626",
    badgeGradient: "linear-gradient(135deg, #2563eb, #60a5fa)",
    decoColor: "rgba(0,0,255,0.09)",
  },
};

const CARD_STYLES = [
  { id: 1, label: "رئيس مركز الاختبارات الكتابية" },
  { id: 2, label: "مساعد رئيس مركز الاختبارات الكتابية" },
  { id: 3, label: "منسق عام" },
  { id: 4, label: "عون تنسيق" },
  { id: 5, label: "الكتابة" },
  { id: 6, label: "العملة" },
  { id: 7, label: "مــراقــب" },
  { id: 8, label: "زائــــــر" },
];

const annee = new Date().getFullYear();

const cardOuter: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 660,
  aspectRatio: "9 / 4.6",
  borderRadius: 18,
  overflow: "hidden",
  boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
  border: "1px solid rgba(0,0,0,0.08)",
  flexShrink: 0,
};

export default function PadgePage() {
  const [nom, setNom] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<number>(0);
  const [editMode, setEditMode] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    if (!cardRef.current) return;
    setDownloading(true);
    const node = cardRef.current;
    const serializer = new XMLSerializer();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${node.offsetWidth * 4}" height="${node.offsetHeight * 4}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="transform:scale(4);transform-origin:top left;width:${node.offsetWidth}px;height:${node.offsetHeight}px">
          ${serializer.serializeToString(node)}
        </div>
      </foreignObject>
    </svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = node.offsetWidth * 4;
      canvas.height = node.offsetHeight * 4;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `badge_${selectedStyle}_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setDownloading(false);
    };
    img.onerror = () => setDownloading(false);
    img.src = url;
  };

  const selectedCard = selectedStyle >= 1 ? CARD_STYLES[selectedStyle - 1] : null;
  const theme = selectedStyle >= 1 ? THEMES[selectedStyle] : null;
  const isSimpleCard = selectedCard && selectedCard.id >= 7;

  let fonction1 = "";
  let fonction2 = "";
  if (selectedCard) {
    const words = selectedCard.label.split(" ");
    const mid = Math.ceil(words.length * 0.5);
    fonction1 = words.slice(0, mid).join(" ");
    fonction2 = words.slice(mid).join(" ");
  }

  return (
    <div className="dashboard">
      <Header />
      <div
        className="dashboard-container"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "32px 16px",
          fontFamily: "'Cairo', 'Tajawal', sans-serif",
        }}
      >
        <style>{`
          @font-face { font-family: 'Bol'; src: url('/bol.otf') format('opentype'); font-weight: 900; }
          @font-face { font-family: 'Tajawal'; src: url('/Tajawal-Bold.ttf') format('truetype'); font-weight: 700; }
          @font-face { font-family: 'Amiri'; src: url('/Amiri-Bold.ttf') format('truetype'); font-weight: 700; }
        `}</style>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: "#1e3a5f",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          صناعة بطاقة شخصية
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
            maxWidth: 1000,
            margin: "0 auto",
            width: "100%",
            alignItems: "start",
          }}
        >
          {/* LEFT — form */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "1.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                  color: "#374151",
                  textAlign: "right",
                }}
              >
                الصفة
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid #e8eaed",
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: "'Bol', sans-serif",
                  textAlign: "right",
                }}
              >
                <option value={0}>---- اختار -----</option>
                {CARD_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedStyle > 0 && (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: "1rem",
                  }}
                >
                  <button
                    onClick={() => setEditMode(true)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: 10,
                      border: editMode
                        ? `2px solid ${theme!.accent}`
                        : "1.5px solid #e8eaed",
                      background: editMode ? "#f3f4f6" : "#fff",
                      color: editMode ? theme!.accent : "#6b7280",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "'Bol', sans-serif",
                    }}
                  >
                    ✏️ تعديل
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: 10,
                      border: !editMode
                        ? `2px solid ${theme!.accent}`
                        : "1.5px solid #e8eaed",
                      background: !editMode ? "#f3f4f6" : "#fff",
                      color: !editMode ? theme!.accent : "#6b7280",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "'Bol', sans-serif",
                    }}
                  >
                    ✓ عرض
                  </button>
                </div>

                {editMode && (
                  <>
                    {!isSimpleCard && (
                      <div style={{ marginBottom: "1rem" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: 8,
                            fontWeight: 600,
                            color: "#374151",
                            textAlign: "right",
                          }}
                        >
                          الاسم الكامل
                        </label>
                        <input
                          value={nom}
                          onChange={(e) => setNom(e.target.value)}
                          placeholder="أدخل الاسم"
                          dir="rtl"
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            border: `1.5px solid ${theme!.accent}`,
                            borderRadius: 10,
                            fontSize: 18,
                            fontFamily: "'Bol', sans-serif",
                            fontWeight: 700,
                            color: "#1e3a5f",
                            textAlign: "right",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    )}
                    {isSimpleCard && (
                      <p
                        style={{
                          color: "#9ca3af",
                          fontSize: 13,
                          textAlign: "center",
                          marginBottom: "1rem",
                        }}
                      >
                        الاسم غير مطلوب لهذه الصفة
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* RIGHT — card preview */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {selectedStyle > 0 && theme ? (
              <div ref={cardRef} dir="rtl" style={cardOuter}>
                {/* Top bar */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 5,
                    background: theme.barGradient,
                  }}
                />

                {/* Deco circle */}
                <div
                  style={{
                    position: "absolute",
                    width: 160,
                    height: 160,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${theme.decoColor} 0%, transparent 70%)`,
                    top: -50,
                    right: -50,
                    pointerEvents: "none",
                  }}
                />

                {/* Inner border */}
                <div
                  style={{
                    position: "absolute",
                    inset: 14,
                    borderRadius: 12,
                    border: `1.5px solid ${theme.accent}22`,
                    pointerEvents: "none",
                  }}
                />

                {isSimpleCard ? (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      background: theme.bgGradient,
                      overflow: "hidden",
                    }}
                  >
                    {/* watermark */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: "url(/icon.png)",
                        backgroundSize: "contain",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        opacity: 0.15,
                        pointerEvents: "none",
                      }}
                    />
                    {/* functio  n text */}
                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                        fontFamily: "'Tajawal', sans-serif",
                        fontSize: 64,
                        fontWeight: 900,
                        color: theme.textFct1,
                        textAlign: "center",
                        direction: "rtl",
                        lineHeight: 1.2,
                        padding: "0 16px",
                      }}
                    >
                      {fonction1}
                      {fonction2 && (
                        <>
                          <br />
                          {fonction2}
                        </>
                      )}
                    </div>
                    {/* year badge — top-left pour RTL */}
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 16,
                        background: theme.badgeGradient,
                        borderRadius: 6,
                        padding: "3px 14px",
                        fontFamily: "'Bol', sans-serif",
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#fff",
                        zIndex: 1,
                      }}
                    >
                      المدرسة الاعدادية ببومرداس
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "18px 28px 14px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                      boxSizing: "border-box",
                      background: theme.bgGradient,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* watermark */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: "url(/icon.png)",
                        backgroundSize: "contain",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        opacity: 0.12,
                        pointerEvents: "none",
                      }}
                    />
                    {/* Institution */}
                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                        fontFamily: "'Bol', sans-serif",
                        fontSize: 17,
                        fontWeight: 900,
                        color: theme.accent,
                        textAlign: "center",
                        direction: "rtl",
                      }}
                    >
                      المدرسة الاعدادية ببومرداس
                    </div>

                    {/* Divider */}
                    <div
                      style={{
                        width: 50,
                        height: 2.5,
                        background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
                        borderRadius: 2,
                        margin: "8px 0 10px",
                      }}
                    />

                    {/* Name */}
                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                        fontFamily: "'Bol', sans-serif",
                        fontSize: 42,
                        fontWeight: 900,
                        color: theme.textName,
                        textAlign: "center",
                        direction: "rtl",
                        whiteSpace: "nowrap",
                        lineHeight: 1.25,
                        marginBottom: 12,
                      }}
                    >
                      {nom || "الاسم الكامل"}
                    </div>

                    {/* Role card */}
                    {fonction1 && (
                      <div
                        style={{
                          position: "relative",
                          zIndex: 1,
                          background: theme.accentBg,
                          border: `1.5px solid ${theme.accent}44`,
                          borderRadius: 12,
                          padding: "10px 18px",
                          textAlign: "center",
                          width: "100%",
                          maxWidth: "80%",
                          boxSizing: "border-box",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Tajawal', sans-serif",
                            fontSize: 17,
                            fontWeight: 900,
                            color: theme.textFct1,
                            direction: "rtl",
                            marginBottom: fonction2 ? 4 : 0,
                          }}
                        >
                          {fonction1}
                        </div>
                        {fonction2 && (
                          <div
                            style={{
                              fontFamily: "'Tajawal', sans-serif",
                              fontSize: 15,
                              fontWeight: 700,
                              color: theme.textFct2,
                              direction: "rtl",
                            }}
                          >
                            {fonction2}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Year row at bottom */}
                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginTop: "auto",
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: theme.accent,
                          opacity: 0.5,
                        }}
                      />
                      <div
                        style={{
                          background: theme.badgeGradient,
                          borderRadius: 8,
                          padding: "5px 22px",
                          fontFamily: "'Bol', sans-serif",
                          fontSize: 14,
                          fontWeight: 900,
                          color: "#fff",
                          boxShadow: `0 3px 10px ${theme.accent}44`,
                        }}
                      >
                        {`بكالوريا ${annee}`}
                      </div>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: theme.accent,
                          opacity: 0.5,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  maxWidth: 660,
                  aspectRatio: "9 / 4.6",
                  background: "#f1f3f4",
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9aa0a6",
                  fontSize: 15,
                }}
              >
                اختر الصفة أولاً
              </div>
            )}

            {selectedStyle > 0 && !editMode && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  marginTop: 16,
                  padding: "10px 32px",
                  background: downloading ? "#9aa0a6" : theme?.accent || "#1e9e57",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: downloading ? "not-allowed" : "pointer",
                  fontFamily: "'Bol', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {downloading ? "جاري التحميل..." : "📥 تحميل البطاقة"}
              </button>
            )}
          </div>
        </div>

        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            color: "#9ca3af",
            fontFamily: "sans-serif",
          }}
        >
          بطاقة 9 × 4,6 سم · قابلة للطباعة
        </p>
      </div>
    </div>
  );
}