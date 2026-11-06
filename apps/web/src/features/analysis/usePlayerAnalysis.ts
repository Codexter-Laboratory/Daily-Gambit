'use client';

import { API_URL } from './apiClient';
import type { PlayerAnalysis } from './analysisTypes';
import { useBrowserAnalysis } from './useBrowserAnalysis';
import { useServerAnalysis } from './useServerAnalysis';

export type { AnalysisProgress, AnalysisStatus, PlayerAnalysis, RunOptions } from './analysisTypes';

/**
 * Analysis for one player. With an API configured (NEXT_PUBLIC_API_URL) the work runs on the
 * server and results are stored there. Without one, it runs in this browser.
 *
 * API_URL is fixed when the app is built, so the same hook is called on every render and the
 * rules of hooks hold.
 */
export const usePlayerAnalysis: (username: string) => PlayerAnalysis = API_URL ? useServerAnalysis : useBrowserAnalysis;
