import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  Grid,
  Typography,
  Button,
  Tab,
  Tabs,
  CircularProgress,
  Box,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import {
  IMusicDifficultyInfo,
  IMusicInfo,
  IMusicVocalInfo,
} from "../../types.d";
import { useCachedData } from "../../utils";
import { getRemoteAssetURL } from "../../utils";
import { useRootStore } from "../../stores/root";

const ChartPreviewPlayer = lazy(() => import("./ChartPreviewPlayer"));

const DIFFICULTIES = ["easy", "normal", "hard", "expert", "master", "append"] as const;
type Difficulty = typeof DIFFICULTIES[number];

const DIFF_COLORS: Record<Difficulty, string> = {
  easy: "#34d399",
  normal: "#38bdf8",
  hard: "#fbbf24",
  expert: "#f87171",
  master: "#a855f7",
  append: "#f472b6",
};

const ChartPreview: React.FC = () => {
  const { musicId } = useParams<{ musicId: string }>();
  const history = useHistory();
  const { region } = useRootStore();

  const [musics] = useCachedData<IMusicInfo>("musics");
  const [musicVocals] = useCachedData<IMusicVocalInfo>("musicVocals");
  const [musicDiffis] = useCachedData<IMusicDifficultyInfo>("musicDifficulties");

  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("master");
  const [susUrl, setSusUrl] = useState<string | null>(null);
  const [bgmUrl, setBgmUrl] = useState<string | undefined>(undefined);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const music = useMemo(
    () => musics?.find((m) => m.id === Number(musicId)),
    [musics, musicId]
  );

  const availableDiffs = useMemo(
    () =>
      musicDiffis
        ?.filter((d) => d.musicId === Number(musicId))
        .sort((a, b) => DIFFICULTIES.indexOf(a.musicDifficulty as Difficulty) - DIFFICULTIES.indexOf(b.musicDifficulty as Difficulty)) ?? [],
    [musicDiffis, musicId]
  );

  const firstVocal = useMemo(
    () => musicVocals?.find((v) => v.musicId === Number(musicId)),
    [musicVocals, musicId]
  );

  const selectedDiffInfo = useMemo(
    () => availableDiffs.find((d) => d.musicDifficulty === selectedDifficulty),
    [availableDiffs, selectedDifficulty]
  );

  useEffect(() => {
    if (!music) return;
    const paddedId = String(music.id).padStart(4, "0");
    const storageBase = import.meta.env.VITE_ASSET_DOMAIN_MINIO;
    setSusUrl(
      `${storageBase}/sekai-jp-assets/music/music_score/${paddedId}_01/${selectedDifficulty}.txt`
    );
  }, [music, selectedDifficulty]);

  useEffect(() => {
    if (!firstVocal) return;
    getRemoteAssetURL(
      `music/long/${firstVocal.assetbundleName}/${firstVocal.assetbundleName}.mp3`,
      setBgmUrl,
      "minio",
      region
    );
  }, [firstVocal, region]);

  useEffect(() => {
    if (!music) return;
    getRemoteAssetURL(
      `music/jacket/${music.assetbundleName}/${music.assetbundleName}.webp`,
      setCoverUrl,
      "minio",
      region
    );
  }, [music, region]);

  // Auto-select first available difficulty
  useEffect(() => {
    if (availableDiffs.length > 0) {
      const hasMaster = availableDiffs.some((d) => d.musicDifficulty === "master");
      if (hasMaster) setSelectedDifficulty("master");
      else setSelectedDifficulty(availableDiffs[availableDiffs.length - 1].musicDifficulty as Difficulty);
    }
  }, [availableDiffs]);

  if (!music) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header bar */}
      <Box sx={{ px: 2, pt: 1, pb: 0 }}>
        <Grid container spacing={1} alignItems="center" style={{ marginBottom: 8 }}>
          <Grid item>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => history.push(`/music/${musicId}`)}
              variant="outlined"
              size="small"
            >
              Back
            </Button>
          </Grid>
          <Grid item>
            <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
              {music.title}
            </Typography>
          </Grid>
          {selectedDiffInfo && (
            <Grid item>
              <Typography variant="body2" color="textSecondary">
                Lv.{selectedDiffInfo.playLevel} · {selectedDiffInfo.totalNoteCount ?? selectedDiffInfo.noteCount} notes
              </Typography>
            </Grid>
          )}
        </Grid>

        {/* Difficulty tabs */}
        <Tabs
          value={selectedDifficulty}
          onChange={(_, v) => setSelectedDifficulty(v)}
          variant="scrollable"
          scrollButtons
          style={{ marginBottom: 8 }}
        >
          {availableDiffs.map((d) => (
            <Tab
              key={d.musicDifficulty}
              value={d.musicDifficulty}
              label={
                <span style={{ color: DIFF_COLORS[d.musicDifficulty as Difficulty] ?? undefined, fontWeight: 700 }}>
                  {d.musicDifficulty.toUpperCase()} {d.playLevel}
                </span>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Player — fullwidth, 16:9 aspect ratio */}
      <Box
        sx={{
          width: "100%",
          position: "relative",
          aspectRatio: "16/9",
          background: "#000",
          flex: 1,
        }}
      >
        {susUrl ? (
          <Suspense fallback={
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          }>
            <ChartPreviewPlayer
              key={`${susUrl}-${bgmUrl}`}
              susUrl={susUrl}
              bgmUrl={bgmUrl}
              rawOffsetMs={null}
              fillerSec={music.fillerSec}
              coverUrl={coverUrl}
              title={music.title}
              difficulty={selectedDifficulty.toUpperCase()}
              composer={music.composer}
              lyricist={music.lyricist}
              arranger={music.arranger}
            />
          </Suspense>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        )}
      </Box>
    </div>
  );
};

export default ChartPreview;