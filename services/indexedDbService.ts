
import { DB_NAME, DB_VERSION, POKEMONS_STORE, TEAMS_STORE, SETTINGS_STORE, TOKEN_BALANCE_KEY, INITIAL_TOKENS, LAST_SPIN_TIME_KEY, MISSIONS_STORE, LAST_MISSION_REFRESH_KEY } from '../constants';
import type { Pokemon, Team, TokenBalance, Mission } from '../types';

let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(POKEMONS_STORE)) {
        dbInstance.createObjectStore(POKEMONS_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!dbInstance.objectStoreNames.contains(TEAMS_STORE)) {
        dbInstance.createObjectStore(TEAMS_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!dbInstance.objectStoreNames.contains(MISSIONS_STORE)) {
        dbInstance.createObjectStore(MISSIONS_STORE, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(SETTINGS_STORE)) {
        const settingsStore = dbInstance.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        settingsStore.transaction.oncomplete = () => {
            const transaction = dbInstance.transaction(SETTINGS_STORE, 'readwrite');
            transaction.objectStore(SETTINGS_STORE).put({ id: TOKEN_BALANCE_KEY, balance: INITIAL_TOKENS });
        };
      }
    };
  });
};

const getStore = (storeName: string, mode: IDBTransactionMode) => {
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
};

// Missions
export const getMissions = async (): Promise<Mission[]> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(MISSIONS_STORE, 'readonly');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveMissions = async (missions: Mission[]): Promise<void> => {
  await initDB();
  const transaction = db.transaction(MISSIONS_STORE, 'readwrite');
  const store = transaction.objectStore(MISSIONS_STORE);
  store.clear();
  missions.forEach(m => store.put(m));
};

export const updateMission = async (mission: Mission): Promise<void> => {
  await initDB();
  const store = getStore(MISSIONS_STORE, 'readwrite');
  store.put(mission);
};

export const getLastMissionRefresh = async (): Promise<number> => {
  await initDB();
  return new Promise((resolve) => {
    const store = getStore(SETTINGS_STORE, 'readonly');
    const request = store.get(LAST_MISSION_REFRESH_KEY);
    request.onsuccess = () => resolve(request.result?.time ?? 0);
    request.onerror = () => resolve(0);
  });
};

export const setLastMissionRefresh = async (time: number): Promise<void> => {
  await initDB();
  const store = getStore(SETTINGS_STORE, 'readwrite');
  store.put({ id: LAST_MISSION_REFRESH_KEY, time });
};

// Settings
export const getTokens = async (): Promise<number> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(SETTINGS_STORE, 'readonly');
    const request = store.get(TOKEN_BALANCE_KEY);
    request.onsuccess = () => {
      resolve(request.result?.balance ?? INITIAL_TOKENS);
    };
    request.onerror = () => reject(request.error);
  });
};

export const setTokens = async (balance: number): Promise<void> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(SETTINGS_STORE, 'readwrite');
    const request = store.put({ id: TOKEN_BALANCE_KEY, balance });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getLastSpinTime = async (): Promise<number> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const store = getStore(SETTINGS_STORE, 'readonly');
        const request = store.get(LAST_SPIN_TIME_KEY);
        request.onsuccess = () => {
            resolve(request.result?.time ?? 0);
        };
        request.onerror = () => reject(request.error);
    });
};

export const setLastSpinTime = async (time: number): Promise<void> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const store = getStore(SETTINGS_STORE, 'readwrite');
        const request = store.put({ id: LAST_SPIN_TIME_KEY, time });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Pokémon
export const addPokemon = async (pokemon: Omit<Pokemon, 'id' | 'status'>): Promise<Pokemon> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(POKEMONS_STORE, 'readwrite');
    const request = store.add({ ...pokemon, status: 'Stored' });
    request.onsuccess = () => {
        const getReq = store.get(request.result);
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getAllPokemons = async (): Promise<Pokemon[]> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(POKEMONS_STORE, 'readonly');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(p => p.status === 'Stored'));
    request.onerror = () => reject(request.error);
  });
};

export const updatePokemon = async (pokemon: Pokemon): Promise<void> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const store = getStore(POKEMONS_STORE, 'readwrite');
        const request = store.put(pokemon);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const deletePokemon = async (id: number): Promise<void> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(POKEMONS_STORE, 'readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Teams
export const addTeam = async (name: string): Promise<Team> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(TEAMS_STORE, 'readwrite');
    const request = store.add({ name, pokemonIds: [] });
    request.onsuccess = () => {
        const getReq = store.get(request.result);
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getAllTeams = async (): Promise<Team[]> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(TEAMS_STORE, 'readonly');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const updateTeam = async (team: Team): Promise<void> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(TEAMS_STORE, 'readwrite');
    const request = store.put(team);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteTeam = async (id: number): Promise<void> => {
  await initDB();
  return new Promise((resolve, reject) => {
    const store = getStore(TEAMS_STORE, 'readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
