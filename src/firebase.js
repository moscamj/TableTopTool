import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    deleteDoc,
    collection,
    onSnapshot,
    writeBatch,
    Timestamp // If using server timestamps
} from 'firebase/firestore';

let app;
let auth;
let db;
let appIdString;

export const initializeAppFirebase = () => {
    // const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG;
    // if (!firebaseConfigString) {
    //     throw new Error("Firebase config not found in environment variables. Make sure VITE_FIREBASE_CONFIG is set in your .env file.");
    // }
    appIdString = import.meta.env.VITE_APP_ID || 'tabletoptool-offline';
    // if (!appIdString) {
    //     console.warn("VITE_APP_ID is not set. Using default 'tabletoptool-generic'.");
    //     appIdString = 'tabletoptool-generic';
    // }

    // try {
    //     const firebaseConfig = JSON.parse(firebaseConfigString);
    //     app = initializeApp(firebaseConfig, appIdString + '-app'); // Unique app name
    //     auth = getAuth(app);
    //     db = getFirestore(app);
    //     console.log("Firebase initialized successfully with App ID:", appIdString);
    //     return { app, auth, db, appIdString };
    // } catch (error) {
    //     console.error("Error parsing Firebase config:", error);
    //     throw new Error("Could not parse Firebase configuration. Check VITE_FIREBASE_CONFIG format.");
    // }
    console.warn("Firebase initialization skipped - OFFLINE MODE");
    return { app: null, auth: null, db: null, appIdString };
};

export const signInUserAnonymously = async (firebaseAuth) => {
    console.warn("Firebase function signInUserAnonymously called - OFFLINE MODE");
    // if (!firebaseAuth) throw new Error("Auth instance not provided to signInUserAnonymously");
    // try {
    //     const userCredential = await signInAnonymously(firebaseAuth);
    //     console.log("User signed in anonymously:", userCredential.user.uid);
    //     return userCredential.user.uid;
    // } catch (error) {
    //     console.error("Error signing in anonymously:", error);
    //     throw error;
    // }
    return Promise.resolve('offline-user');
};

// Monitor auth state
export const onAuthChanges = (firebaseAuth, callback) => {
    console.warn("Firebase function onAuthChanges called - OFFLINE MODE");
    // if (!firebaseAuth) {
    //     console.warn("Auth instance not provided to onAuthChanges, returning no-op unsubscribe.");
    //     return () => {}; // Return a no-op unsubscribe function
    // }
    // return onAuthStateChanged(firebaseAuth, callback);
    if (callback) {
        callback({ uid: 'offline-user', isAnonymous: true });
    }
    return () => {};
};


const getSessionObjectsCollectionPath = (currentAppIdString, sessionId) => {
    // This function is still used by the offline stubs, so it needs to work.
    if (!currentAppIdString || !sessionId) throw new Error("App ID and Session ID are required for collection path.");
    return `apps/${currentAppIdString}/sessions/${sessionId}/objects`;
};

const getSessionMetadataDocPath = (currentAppIdString, sessionId) => {
    // This function is still used by the offline stubs, so it needs to work.
    if (!currentAppIdString || !sessionId) throw new Error("App ID and Session ID are required for doc path.");
    return `apps/${currentAppIdString}/sessions/${sessionId}/metadata/table`;
};

export const saveObjectToFirestore = async (firestoreDb, currentAppIdString, sessionId, objectData) => {
    console.warn("Firebase function saveObjectToFirestore called - OFFLINE MODE");
    // if (!firestoreDb || !currentAppIdString || !sessionId || !objectData || !objectData.id) {
    //     console.error("Missing parameters for saveObjectToFirestore", { firestoreDb, currentAppIdString, sessionId, objectData });
    //     throw new Error("Missing parameters: db, appId, sessionId, or objectData with id must be provided.");
    // }
    // const objectId = objectData.id;
    // const docPath = `${getSessionObjectsCollectionPath(currentAppIdString, sessionId)}/${objectId}`;
    // try {
    //     await setDoc(doc(firestoreDb, docPath), { ...objectData, lastUpdated: Timestamp.now() });
    //     console.log(`Object ${objectId} saved to Firestore in session ${sessionId}`);
    // } catch (error) {
    //     console.error(`Error saving object ${objectId} to Firestore:`, error);
    //     throw error;
    // }
    return Promise.resolve();
};

export const deleteObjectFromFirestore = async (firestoreDb, currentAppIdString, sessionId, objectId) => {
    console.warn("Firebase function deleteObjectFromFirestore called - OFFLINE MODE");
    // if (!firestoreDb || !currentAppIdString || !sessionId || !objectId) {
    //     throw new Error("Missing parameters: db, appId, sessionId, or objectId must be provided.");
    // }
    // const docPath = `${getSessionObjectsCollectionPath(currentAppIdString, sessionId)}/${objectId}`;
    // try {
    //     await deleteDoc(doc(firestoreDb, docPath));
    //     console.log(`Object ${objectId} deleted from Firestore in session ${sessionId}`);
    // } catch (error) {
    //     console.error(`Error deleting object ${objectId} from Firestore:`, error);
    //     throw error;
    // }
    return Promise.resolve();
};

export const loadObjectsFromFirestore = (firestoreDb, currentAppIdString, sessionId, callback) => {
    console.warn("Firebase function loadObjectsFromFirestore called - OFFLINE MODE");
    // if (!firestoreDb || !currentAppIdString || !sessionId || !callback) {
    //     throw new Error("Missing parameters: db, appId, sessionId, or callback must be provided.");
    // }
    // const collPath = getSessionObjectsCollectionPath(currentAppIdString, sessionId);
    // const q = collection(firestoreDb, collPath);

    // const unsubscribe = onSnapshot(q, (querySnapshot) => {
    //     const objects = [];
    //     querySnapshot.forEach((doc) => {
    //         objects.push({ id: doc.id, ...doc.data() });
    //     });
    //     callback(objects);
    // }, (error) => {
    //     console.error(`Error loading objects from Firestore session ${sessionId}:`, error);
    //     // Potentially call callback with an error or empty array
    //     callback([], error);
    // });

    // return unsubscribe; // Return the unsubscribe function
    if (callback) {
        callback([]);
    }
    return () => {};
};

export const saveTableMetadata = async (firestoreDb, currentAppIdString, sessionId, metadata) => {
    console.warn("Firebase function saveTableMetadata called - OFFLINE MODE");
    //  if (!firestoreDb || !currentAppIdString || !sessionId || !metadata) {
    //     throw new Error("Missing parameters: db, appId, sessionId, or metadata must be provided.");
    // }
    // const docPath = getSessionMetadataDocPath(currentAppIdString, sessionId);
    // try {
    //     await setDoc(doc(firestoreDb, docPath), { ...metadata, lastUpdated: Timestamp.now() });
    //     console.log(`Table metadata saved for session ${sessionId}`);
    // } catch (error) {
    //     console.error(`Error saving table metadata for session ${sessionId}:`, error);
    //     throw error;
    // }
    return Promise.resolve();
};

export const loadTableMetadata = (firestoreDb, currentAppIdString, sessionId, callback) => {
    console.warn("Firebase function loadTableMetadata called - OFFLINE MODE");
    // if (!firestoreDb || !currentAppIdString || !sessionId || !callback) {
    //     throw new Error("Missing parameters: db, appId, sessionId, or callback must be provided.");
    // }
    // const docPath = getSessionMetadataDocPath(currentAppIdString, sessionId);

    // const unsubscribe = onSnapshot(doc(firestoreDb, docPath), (docSnap) => {
    //     if (docSnap.exists()) {
    //         callback(docSnap.data());
    //     } else {
    //         console.log(`No table metadata found for session ${sessionId}. Using defaults.`);
    //         callback(null); // Or some default metadata structure
    //     }
    // }, (error) => {
    //     console.error(`Error loading table metadata for session ${sessionId}:`, error);
    //     callback(null, error);
    // });

    // return unsubscribe; // Return the unsubscribe function
    if (callback) {
        callback(null);
    }
    return () => {};
};

// Optional: Helper for batch operations if needed later
export const getFirestoreBatch = (firestoreDb) => {
    console.warn("Firebase function getFirestoreBatch called - OFFLINE MODE");
    // return writeBatch(firestoreDb);
    return {
        commit: () => Promise.resolve(),
        // Add other batch methods like set, update, delete if your app uses them directly on the batch object
        set: () => {},
        update: () => {},
        delete: () => {}
    };
};

// Initialize on load if VITE_FIREBASE_CONFIG is present,
// otherwise it will be initialized by main.js calling initializeAppFirebase()
// This allows firebase.js to be imported and used by other modules
// without immediately throwing if config isn't there yet (e.g. during tests or if main.js controls init timing)
// if (import.meta.env.VITE_FIREBASE_CONFIG) {
//     try {
//         initializeAppFirebase();
//     } catch (e) {
//         console.warn("Firebase auto-initialization on load failed. Ensure initializeAppFirebase() is called.", e.message);
//     }
// }
