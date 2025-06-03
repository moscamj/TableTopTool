// // src/firebase.js
// // This module handles Firebase integration.
// // NOTE: CURRENTLY CONFIGURED FOR OFFLINE MODE.
// // Most functions are stubbed to allow the application to run without a live Firebase backend.
// // The original Firebase logic is preserved in commented-out blocks within each function
// // for easy reactivation when online capabilities are required.

// import log from "loglevel";
// import { initializeApp } from "firebase/app";
// import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
// import {
//         getFirestore,
//         doc,
//         setDoc,
//         deleteDoc,
//         collection,
//         onSnapshot,
//         writeBatch,
//         Timestamp, // If using server timestamps
// } from "firebase/firestore";

// let app;
// let auth;
// let db;
// let appIdString;

// /**
//  * Initializes the Firebase application instance, authentication, and Firestore.
//  * Currently stubbed for OFFLINE MODE. Uncomment Firebase-specific lines to enable.
//  * @returns {{app: object|null, auth: object|null, db: object|null, appIdString: string}}
//  *          Firebase services and the app ID string. Returns null for services in offline mode.
//  */
// export const initializeAppFirebase = () => {
//         // const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG;
//         // if (!firebaseConfigString) {
//         //     throw new Error("Firebase config not found in environment variables. Make sure VITE_FIREBASE_CONFIG is set in your .env file.");
//         // }
//         appIdString = import.meta.env.VITE_APP_ID || "tabletoptool-offline";
//         // if (!appIdString) {
//         //     console.warn("VITE_APP_ID is not set. Using default 'tabletoptool-generic'.");
//         //     appIdString = 'tabletoptool-generic';
//         // }

//         // try {
//         //     const firebaseConfig = JSON.parse(firebaseConfigString);
//         //     app = initializeApp(firebaseConfig, `${appIdString}-app`); // Unique app name
//         //     auth = getAuth(app);
//         //     db = getFirestore(app);
//         //     log.info("Firebase initialized successfully with App ID:", appIdString);
//         //     return { app, auth, db, appIdString };
//         // } catch (error) {
//         //     log.error("Error parsing Firebase config:", error);
//         //     throw new Error("Could not parse Firebase configuration. Check VITE_FIREBASE_CONFIG format.");
//         // }
//         log.warn("Firebase initialization skipped - OFFLINE MODE");
//         return { app: null, auth: null, db: null, appIdString };
// };

// /**
//  * Signs in the user anonymously using Firebase Authentication.
//  * Currently stubbed for OFFLINE MODE.
//  * @async
//  * @param {object} firebaseAuth - The Firebase Auth instance.
//  * @returns {Promise<string>} A promise that resolves with the user's UID. Resolves with 'offline-user' in offline mode.
//  * @throws {Error} If Firebase Auth instance is not provided (in online mode).
//  */
// export const signInUserAnonymously = async (firebaseAuth) => {
//         log.warn("Firebase function signInUserAnonymously called - OFFLINE MODE");
//         // if (!firebaseAuth) throw new Error("Auth instance not provided to signInUserAnonymously");
//         // try {
//         //     const userCredential = await signInAnonymously(firebaseAuth);
//         //     log.info("User signed in anonymously:", userCredential.user.uid);
//         //     return userCredential.user.uid;
//         // } catch (error) {
//         //     log.error("Error signing in anonymously:", error);
//         //     throw error;
//         // }
//         return Promise.resolve("offline-user");
// };

// /**
//  * Registers an observer for Firebase Authentication state changes.
//  * Currently stubbed for OFFLINE MODE.
//  * @param {object} firebaseAuth - The Firebase Auth instance.
//  * @param {function(user: object|null): void} callback - Function to call when auth state changes.
//  * @returns {function(): void} An unsubscribe function. Returns a no-op in offline mode.
//  */
// export const onAuthChanges = (firebaseAuth, callback) => {
//         log.warn("Firebase function onAuthChanges called - OFFLINE MODE");
//         // if (!firebaseAuth) {
//         //     log.warn("Auth instance not provided to onAuthChanges, returning no-op unsubscribe.");
//         //     return () => {}; // Return a no-op unsubscribe function
//         // }
//         // return onAuthStateChanged(firebaseAuth, callback);
//         if (callback) {
//                 callback({ uid: "offline-user", isAnonymous: true });
//         }
//         return () => {};
// };

// /**
//  * Constructs the Firestore path for the 'objects' collection within a specific session.
//  * Original Firebase logic would use this path.
//  * @param {string} currentAppIdString - The application ID.
//  * @param {string} sessionId - The session ID.
//  * @returns {string} The Firestore collection path.
//  * @throws {Error} If appIdString or sessionId is missing.
//  */
// const getSessionObjectsCollectionPath = (currentAppIdString, sessionId) => {
//         // Path construction for Firestore.
//         if (!currentAppIdString || !sessionId)
//                 throw new Error("App ID and Session ID are required for collection path.");
//         return `apps/${currentAppIdString}/sessions/${sessionId}/objects`;
// };

// /**
//  * Constructs the Firestore path for the 'table' metadata document within a specific session.
//  * Original Firebase logic would use this path.
//  * @param {string} currentAppIdString - The application ID.
//  * @param {string} sessionId - The session ID.
//  * @returns {string} The Firestore document path.
//  * @throws {Error} If appIdString or sessionId is missing.
//  */
// const getSessionMetadataDocPath = (currentAppIdString, sessionId) => {
//         if (!currentAppIdString || !sessionId)
//                 throw new Error("App ID and Session ID are required for doc path.");
//         return `apps/${currentAppIdString}/sessions/${sessionId}/metadata/table`;
// };

// /**
//  * Saves (or updates) an object's data in Firestore.
//  * Currently stubbed for OFFLINE MODE.
//  * @async
//  * @param {object} firestoreDb - The Firestore instance.
//  * @param {string} currentAppIdString - The application ID.
//  * @param {string} sessionId - The session ID.
//  * @param {object} objectData - The object data to save (must include an 'id' property).
//  * @returns {Promise<void>}
//  * @throws {Error} If required parameters are missing (in online mode).
//  */
// export const saveObjectToFirestore = async (
//         firestoreDb,
//         currentAppIdString,
//         sessionId,
//         objectData,
// ) => {
//         log.warn("Firebase function saveObjectToFirestore called - OFFLINE MODE");
//         // if (!firestoreDb || !currentAppIdString || !sessionId || !objectData || !objectData.id) {
//         //     log.error("Missing parameters for saveObjectToFirestore", { firestoreDb, currentAppIdString, sessionId, objectData });
//         //     throw new Error("Missing parameters: db, appId, sessionId, or objectData with id must be provided.");
//         // }
//         // const objectId = objectData.id;
//         // const docPath = `${getSessionObjectsCollectionPath(currentAppIdString, sessionId)}/${objectId}`;
//         // try {
//         //     await setDoc(doc(firestoreDb, docPath), { ...objectData, lastUpdated: Timestamp.now() });
//         //     log.info(`Object ${objectId} saved to Firestore in session ${sessionId}`);
//         // } catch (error) {
//         //     log.error(`Error saving object ${objectId} to Firestore:`, error);
//         //     throw error;
//         // }
//         return Promise.resolve();
// };

// /**
//  * Deletes an object from Firestore.
//  * Currently stubbed for OFFLINE MODE.
//  * @async
//  * @param {object} firestoreDb - The Firestore instance.
//  * @param {string} currentAppIdString - The application ID.
//  * @param {string} sessionId - The session ID.
//  * @param {string} objectId - The ID of the object to delete.
//  * @returns {Promise<void>}
//  * @throws {Error} If required parameters are missing (in online mode).
//  */
// export const deleteObjectFromFirestore = async (
//         firestoreDb,
//         currentAppIdString,
//         sessionId,
//         objectId,
// ) => {
//         log.warn("Firebase function deleteObjectFromFirestore called - OFFLINE MODE");
//         // if (!firestoreDb || !currentAppIdString || !sessionId || !objectId) {
//         //     throw new Error("Missing parameters: db, appId, sessionId, or objectId must be provided.");
//         // }
//         // const docPath = `${getSessionObjectsCollectionPath(currentAppIdString, sessionId)}/${objectId}`;
//         // try {
//         //     await deleteDoc(doc(firestoreDb, docPath));
//         //     log.info(`Object ${objectId} deleted from Firestore in session ${sessionId}`);
//         // } catch (error) {
//         //     log.error(`Error deleting object ${objectId} from Firestore:`, error);
//         //     throw error;
//         // }
//         return Promise.resolve();
// };

// /**
//  * Loads all objects from Firestore for a given session and listens for real-time updates.
//  * Currently stubbed for OFFLINE MODE.
//  * @param {object} firestoreDb - The Firestore instance.
//  * @param {string} currentAppIdString - The application ID.
//  * @param {string} sessionId - The session ID.
//  * @param {function(objects: object[], error?: Error): void} callback - Function to call with the array of objects or on error.
//  * @returns {function(): void} An unsubscribe function. Returns a no-op in offline mode.
//  */
// export const loadObjectsFromFirestore = (
//         firestoreDb,
//         currentAppIdString,
//         sessionId,
//         callback,
// ) => {
//         log.warn("Firebase function loadObjectsFromFirestore called - OFFLINE MODE");
//         // if (!firestoreDb || !currentAppIdString || !sessionId || !callback) {
//         //     throw new Error("Missing parameters: db, appId, sessionId, or callback must be provided.");
//         // }
//         // const collPath = getSessionObjectsCollectionPath(currentAppIdString, sessionId);
//         // const q = collection(firestoreDb, collPath);

//         // const unsubscribe = onSnapshot(q, (querySnapshot) => {
//         //     const objects = [];
//         //     querySnapshot.forEach((doc) => {
//         //         objects.push({ id: doc.id, ...doc.data() });
//         //     });
//         //     callback(objects);
//         // }, (error) => {
//         //     log.error(`Error loading objects from Firestore session ${sessionId}:`, error);
//         //     // Potentially call callback with an error or empty array
//         //     callback([], error);
//         // });

//         // return unsubscribe; // Return the unsubscribe function
//         if (callback) {
//                 callback([]); // Call with empty array for offline mode
//         }
//         return () => {}; // Return a no-op unsubscribe function
// };

// /**
//  * Saves table-level metadata (e.g., background, pan/zoom state) to Firestore.
//  * Currently stubbed for OFFLINE MODE.
//  * @async
//  * @param {object} firestoreDb - The Firestore instance.
//  * @param {string} currentAppIdString - The application ID.
//  * @param {string} sessionId - The session ID.
//  * @param {object} metadata - The metadata object to save.
//  * @returns {Promise<void>}
//  * @throws {Error} If required parameters are missing (in online mode).
//  */
// export const saveTableMetadata = async (
//         firestoreDb,
//         currentAppIdString,
//         sessionId,
//         metadata,
// ) => {
//         log.warn("Firebase function saveTableMetadata called - OFFLINE MODE");
//         //  if (!firestoreDb || !currentAppIdString || !sessionId || !metadata) {
//         //     throw new Error("Missing parameters: db, appId, sessionId, or metadata must be provided.");
//         // }
//         // const docPath = getSessionMetadataDocPath(currentAppIdString, sessionId);
//         // try {
//         //     await setDoc(doc(firestoreDb, docPath), { ...metadata, lastUpdated: Timestamp.now() });
//         //     log.info(`Table metadata saved for session ${sessionId}`);
//         // } catch (error) {
//         //     log.error(`Error saving table metadata for session ${sessionId}:`, error);
//         //     throw error;
//         // }
//         return Promise.resolve();
// };

// /**
//  * Loads table-level metadata from Firestore and listens for real-time updates.
//  * Currently stubbed for OFFLINE MODE.
//  * @param {object} firestoreDb - The Firestore instance.
//  * @param {string} currentAppIdString - The application ID.
//  * @param {string} sessionId - The session ID.
//  * @param {function(metadata: object|null, error?: Error): void} callback - Function to call with loaded metadata or on error.
//  * @returns {function(): void} An unsubscribe function. Returns a no-op in offline mode.
//  */
// export const loadTableMetadata = (
//         firestoreDb,
//         currentAppIdString,
//         sessionId,
//         callback,
// ) => {
//         log.warn("Firebase function loadTableMetadata called - OFFLINE MODE");
//         // if (!firestoreDb || !currentAppIdString || !sessionId || !callback) {
//         //     throw new Error("Missing parameters: db, appId, sessionId, or callback must be provided.");
//         // }
//         // const docPath = getSessionMetadataDocPath(currentAppIdString, sessionId);

//         // const unsubscribe = onSnapshot(doc(firestoreDb, docPath), (docSnap) => {
//         //     if (docSnap.exists()) {
//         //         callback(docSnap.data());
//         //     } else {
//         //         log.info(`No table metadata found for session ${sessionId}. Using defaults.`);
//         //         callback(null); // Or some default metadata structure
//         //     }
//         // }, (error) => {
//         //     log.error(`Error loading table metadata for session ${sessionId}:`, error);
//         //     callback(null, error);
//         // });

//         // return unsubscribe; // Return the unsubscribe function
//         if (callback) {
//                 callback(null);
//         }
//         return () => {};
// };

// /**
//  * Creates a Firestore write batch instance.
//  * Currently stubbed for OFFLINE MODE.
//  * @param {object} firestoreDb - The Firestore instance.
//  * @returns {object} A stubbed Firestore WriteBatch object with a commit method.
//  */
// export const getFirestoreBatch = (firestoreDb) => {
//         log.warn("Firebase function getFirestoreBatch called - OFFLINE MODE");
//         // return writeBatch(firestoreDb);
//         return {
//                 commit: () => Promise.resolve(),
//                 // Add other batch methods like set, update, delete if your app uses them directly on the batch object
//                 set: () => {}, // Stubbed: no-op
//                 update: () => {}, // Stubbed: no-op
//                 delete: () => {}, // Stubbed: no-op
//         };
// };

// // Initialize on load if VITE_FIREBASE_CONFIG is present,
// // otherwise it will be initialized by main.js calling initializeAppFirebase()
// // This allows firebase.js to be imported and used by other modules
// // without immediately throwing if config isn't there yet (e.g. during tests or if main.js controls init timing)
// // if (import.meta.env.VITE_FIREBASE_CONFIG) {
// //     try {
// //         initializeAppFirebase();
// //     } catch (e) {
// //         log.warn("Firebase auto-initialization on load failed. Ensure initializeAppFirebase() is called.", e.message);
// //     }
// // }
