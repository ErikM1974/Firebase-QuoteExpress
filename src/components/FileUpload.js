import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, deleteDoc, getDocs } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { storage, db } from '../firebase';
import Papa from 'papaparse';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('Please select a file first.');
      return;
    }

    try {
      if (!isAuthenticated) {
        setUploadStatus('Authenticating...');
        const auth = getAuth();
        await signInAnonymously(auth);
      }

      setUploadStatus('Uploading file...');
      const storageRef = ref(storage, 'csvs/' + file.name);

      // Upload file to Firebase Storage
      const snapshot = await uploadBytes(storageRef, file);
      console.log('CSV file uploaded successfully');

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Parse CSV file
      const csvData = await new Promise((resolve, reject) => {
        Papa.parse(file, {
          complete: (results) => resolve(results.data),
          error: (error) => reject(error),
          header: true
        });
      });

      // Clear existing data
      const embroideryItemsRef = collection(db, "embroidery_items");
      const existingDocs = await getDocs(embroideryItemsRef);
      existingDocs.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      // Store CSV data in Firestore
      for (const row of csvData) {
        await addDoc(collection(db, "embroidery_items"), row);
      }

      // Store file metadata
      await addDoc(collection(db, "csv_files"), {
        fileName: file.name,
        uploadDate: new Date(),
        downloadURL: downloadURL
      });

      setUploadStatus('File uploaded and processed successfully!');
    } catch (error) {
      console.error("Error uploading file: ", error);
      setUploadStatus('Error uploading file. Please try again.');
    }
  };

  return (
    <div>
      <h2>Upload CSV File</h2>
      <input type="file" onChange={handleFileChange} accept=".csv" />
      <button onClick={handleUpload} disabled={!isAuthenticated}>Upload CSV</button>
      {uploadStatus && <p>{uploadStatus}</p>}
    </div>
  );
};

export default FileUpload;