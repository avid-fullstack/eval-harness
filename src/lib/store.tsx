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

// Fetching datasets, graders, and results from the API on app load.
async function loadFromDb(): Promise<{
  datasets: Dataset[];
  graders: Grader[];
  results: ExperimentResult[];
}> {
  const res = await fetch(API_DATA);
  if (!res.ok) return { datasets: [], graders: [], results: [] };
  const data = await res.json();
  return {
    datasets: data.datasets ?? [],
    graders: data.graders ?? [],
    results: data.results ?? [],
  };
}

// Persisting state to the API. Fire-and-forget; avoid blocking the UI.
function persistToDb(state: {
  datasets: Dataset[];
  graders: Grader[];
  results: ExperimentResult[];
}) {
  fetch(API_DATA, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  }).catch((e) => console.error("Persist failed:", e));
}

interface StoreState {
  datasets: Dataset[];
  graders: Grader[];
  results: ExperimentResult[];
}

interface StoreContextValue extends StoreState {
  addDataset: (name: string) => Dataset;
  updateDataset: (id: string, updates: Partial<Dataset>) => void;
  deleteDataset: (id: string) => void;
  addTestCase: (datasetId: string, testCase: Omit<TestCase, "id">) => void;
  updateTestCase: (
    datasetId: string,
    testCaseId: string,
    updates: Partial<TestCase>
  ) => void;
  deleteTestCase: (datasetId: string, testCaseId: string) => void;

  addGrader: (grader: Omit<Grader, "id">) => void;
  updateGrader: (id: string, updates: Partial<Grader>) => void;
  deleteGrader: (id: string) => void;

  setResults: (results: ExperimentResult[]) => void;
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

  // Loading data from the database on mount. Avoid: running twice (StrictMode).
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadFromDb().then((data) => setState(data));
  }, []);

  const persist = useCallback((s: StoreState) => {
    persistToDb(s);
  }, []);

  // Adding a dataset. Persisting after each mutation.
  const addDataset = useCallback(
    (name: string) => {
      const dataset: Dataset = {
        id: genId(),
        name,
        testCases: [],
      };
      setState((s) => {
        const next = { ...s, datasets: [...s.datasets, dataset] };
        persist(next);
        return next;
      });
      return dataset;
    },
    [persist]
  );

  // Updating a dataset by ID.
  const updateDataset = useCallback(
    (id: string, updates: Partial<Dataset>) => {
      setState((s) => {
        const next = {
          ...s,
          datasets: s.datasets.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // Deleting a dataset and pruning results for its test cases.
  const deleteDataset = useCallback(
    (id: string) => {
      setState((s) => {
        const ds = s.datasets.find((d) => d.id === id);
        const next = {
          ...s,
          datasets: s.datasets.filter((d) => d.id !== id),
          results: s.results.filter((r) =>
            ds ? !ds.testCases.some((tc) => tc.id === r.testCaseId) : true
          ),
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // Adding a test case to a dataset.
  const addTestCase = useCallback(
    (datasetId: string, testCase: Omit<TestCase, "id">) => {
      const tc: TestCase = { ...testCase, id: genId() };
      setState((s) => {
        const next = {
          ...s,
          datasets: s.datasets.map((d) =>
            d.id === datasetId
              ? { ...d, testCases: [...d.testCases, tc] }
              : d
          ),
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // Updating a test case by dataset and test case ID.
  const updateTestCase = useCallback(
    (
      datasetId: string,
      testCaseId: string,
      updates: Partial<TestCase>
    ) => {
      setState((s) => {
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
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // Deleting a test case and its results.
  const deleteTestCase = useCallback(
    (datasetId: string, testCaseId: string) => {
      setState((s) => {
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
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // Adding a grader definition.
  const addGrader = useCallback(
    (grader: Omit<Grader, "id">) => {
      const g: Grader = { ...grader, id: genId() };
      setState((s) => {
        const next = { ...s, graders: [...s.graders, g] };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // Updating a grader by ID.
  const updateGrader = useCallback(
    (id: string, updates: Partial<Grader>) => {
      setState((s) => {
        const next = {
          ...s,
          graders: s.graders.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // Deleting a grader and its results.
  const deleteGrader = useCallback(
    (id: string) => {
      setState((s) => {
        const next = {
          ...s,
          graders: s.graders.filter((g) => g.id !== id),
          results: s.results.filter((r) => r.graderId !== id),
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // Replacing experiment results after a run.
  const setResults = useCallback(
    (results: ExperimentResult[]) => {
      setState((s) => {
        const next = { ...s, results };
        persist(next);
        return next;
      });
    },
    [persist]
  );

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
      persist,
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
