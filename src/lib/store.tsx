"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Dataset, ExperimentResult, Grader, TestCase } from "./types";

const API_DATA = "/api/data";

// Fetch datasets, graders, and results from GET /api/data on app load. Returns empty state on any failure.
async function loadFromDb(): Promise<{
  datasets: Dataset[];
  graders: Grader[];
  results: ExperimentResult[];
}> {
  try {
    const res = await fetch(API_DATA);
    if (!res.ok) return { datasets: [], graders: [], results: [] };
    const data = await res.json();
    return {
      datasets: data.datasets ?? [],
      graders: data.graders ?? [],
      results: data.results ?? [],
    };
  } catch (e) {
    // Catch network errors or res.json() failures (e.g. invalid response) so the app can still mount with empty state.
    console.error("Load from API failed:", e);
    return { datasets: [], graders: [], results: [] };
  }
}

// POST full state to /api/data. Returns a promise so callers can await; throws on non-ok response or network error.
async function persistToDb(state: {
  datasets: Dataset[];
  graders: Grader[];
  results: ExperimentResult[];
}): Promise<void> {
  try {
    const res = await fetch(API_DATA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? "Failed to save");
    }
  } catch (e) {
    // Catch network errors or non-ok response; log and rethrow so the store mutation can show an error in the UI.
    console.error("Persist to API failed:", e);
    throw e;
  }
}

interface StoreState {
  datasets: Dataset[];
  graders: Grader[];
  results: ExperimentResult[];
}

interface StoreContextValue extends StoreState {
  addDataset: (name: string) => Promise<Dataset>;
  updateDataset: (id: string, updates: Partial<Dataset>) => Promise<void>;
  deleteDataset: (id: string) => Promise<void>;
  addTestCase: (datasetId: string, testCase: Omit<TestCase, "id">) => Promise<void>;
  updateTestCase: (
    datasetId: string,
    testCaseId: string,
    updates: Partial<TestCase>
  ) => Promise<void>;
  deleteTestCase: (datasetId: string, testCaseId: string) => Promise<void>;

  addGrader: (grader: Omit<Grader, "id">) => Promise<void>;
  updateGrader: (id: string, updates: Partial<Grader>) => Promise<void>;
  deleteGrader: (id: string) => Promise<void>;

  setResults: (results: ExperimentResult[]) => Promise<void>;
  getDataset: (id: string) => Dataset | undefined;
  getGrader: (id: string) => Grader | undefined;
}

// Generating a short random ID for new entities.
function genId() {
  return Math.random().toString(36).slice(2, 11);
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>({
    datasets: [],
    graders: [],
    results: [],
  });
  const loadedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadFromDb().then((data) => setState(data));
  }, []);

  const addDataset = useCallback(async (name: string) => {
    const dataset: Dataset = {
      id: genId(),
      name,
      testCases: [],
    };
    const s = stateRef.current;
    const next = { ...s, datasets: [...s.datasets, dataset] };
    await persistToDb(next);
    setState(next);
    return dataset;
  }, []);

  const updateDataset = useCallback(async (id: string, updates: Partial<Dataset>) => {
    const s = stateRef.current;
    const next = {
      ...s,
      datasets: s.datasets.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    };
    await persistToDb(next);
    setState(next);
  }, []);

  const deleteDataset = useCallback(async (id: string) => {
    const s = stateRef.current;
    const ds = s.datasets.find((d) => d.id === id);
    const next = {
      ...s,
      datasets: s.datasets.filter((d) => d.id !== id),
      results: s.results.filter((r) =>
        ds ? !ds.testCases.some((tc) => tc.id === r.testCaseId) : true
      ),
    };
    await persistToDb(next);
    setState(next);
  }, []);

  const addTestCase = useCallback(async (datasetId: string, testCase: Omit<TestCase, "id">) => {
    const tc: TestCase = { ...testCase, id: genId() };
    const s = stateRef.current;
    const next = {
      ...s,
      datasets: s.datasets.map((d) =>
        d.id === datasetId
          ? { ...d, testCases: [...d.testCases, tc] }
          : d
      ),
    };
    await persistToDb(next);
    setState(next);
  }, []);

  const updateTestCase = useCallback(
    async (
      datasetId: string,
      testCaseId: string,
      updates: Partial<TestCase>
    ) => {
      const s = stateRef.current;
      const next = {
        ...s,
        datasets: s.datasets.map((d) =>
          d.id === datasetId
            ? {
                ...d,
                testCases: d.testCases.map((tc) =>
                  tc.id === testCaseId ? { ...tc, ...updates } : tc
                ),
              }
            : d
        ),
      };
      await persistToDb(next);
      setState(next);
    },
    []
  );

  const deleteTestCase = useCallback(async (datasetId: string, testCaseId: string) => {
    const s = stateRef.current;
    const next = {
      ...s,
      datasets: s.datasets.map((d) =>
        d.id === datasetId
          ? {
              ...d,
              testCases: d.testCases.filter((tc) => tc.id !== testCaseId),
            }
          : d
      ),
      results: s.results.filter((r) => r.testCaseId !== testCaseId),
    };
    await persistToDb(next);
    setState(next);
  }, []);

  const addGrader = useCallback(async (grader: Omit<Grader, "id">) => {
    const g: Grader = { ...grader, id: genId() };
    const s = stateRef.current;
    const next = { ...s, graders: [...s.graders, g] };
    await persistToDb(next);
    setState(next);
  }, []);

  const updateGrader = useCallback(async (id: string, updates: Partial<Grader>) => {
    const s = stateRef.current;
    const next = {
      ...s,
      graders: s.graders.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
    };
    await persistToDb(next);
    setState(next);
  }, []);

  const deleteGrader = useCallback(async (id: string) => {
    const s = stateRef.current;
    const next = {
      ...s,
      graders: s.graders.filter((g) => g.id !== id),
      results: s.results.filter((r) => r.graderId !== id),
    };
    await persistToDb(next);
    setState(next);
  }, []);

  const setResults = useCallback(async (results: ExperimentResult[]) => {
    const s = stateRef.current;
    const next = { ...s, results };
    setState(next);
    await persistToDb(next);
  }, []);

  const getDataset = useCallback(
    (id: string) => state.datasets.find((d) => d.id === id),
    [state.datasets]
  );

  const getGrader = useCallback(
    (id: string) => state.graders.find((g) => g.id === id),
    [state.graders]
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      ...state,
      addDataset,
      updateDataset,
      deleteDataset,
      addTestCase,
      updateTestCase,
      deleteTestCase,
      addGrader,
      updateGrader,
      deleteGrader,
      setResults,
      getDataset,
      getGrader,
    }),
    [
      state,
      addDataset,
      updateDataset,
      deleteDataset,
      addTestCase,
      updateTestCase,
      deleteTestCase,
      addGrader,
      updateGrader,
      deleteGrader,
      setResults,
      getDataset,
      getGrader,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

// Consuming the store. Must be used inside StoreProvider.
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
