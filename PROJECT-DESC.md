# PROJECT SPECIFICATION: AI-Driven Interview Simulator (Full-Stack)

## 1. Project Overview

This project is a Data Science Capstone Project developing an AI-Driven Interview Simulator. The system evaluates a candidate's interview performance through automated multimodal analysis (Video, Audio, and Text) and provides an objective Final Score (0-100) along with actionable feedback.

## 2. Full-Stack Architecture

The application is structured as a decoupled frontend and backend to seamlessly integrate modern web UI with heavy Python-based machine learning processing.

### A. Frontend (Next.js + Tailwind CSS)

* **Goal:** Provide a sleek, responsive user interface for candidates to record/upload their interview videos and view their evaluation dashboards.

* **Tech Stack:** Next.js (React framework) for routing and UI, Tailwind CSS for styling.

* **Responsibility:** Capture user media (webcam/microphone or file upload), send payload via REST API to the backend, and render the resulting JSON (scores and feedback) in a readable dashboard.

### B. Backend (FastAPI - Python)

* **Goal:** A lightweight, high-performance API server to handle requests, run the heavy ML pipelines, and return results.

* **Tech Stack:** FastAPI (Python 3.10), Uvicorn.

* **Responsibility:** Receive `multipart/form-data` (video/audio files), route them to the ML processing modules, calculate the Final Score, and return a JSON response. 

## 3. ML Processing Modules (Triggered by Backend)

The backend triggers three distinct processing modules that run before being fused:

### A. Visual Module (Confidence &amp; Non-Verbal)

* **Tech Stack:** `mediapipe` (pose landmarks, body gesture), `ultralytics` YOLO Face &amp; FER+ (eye contact, emotion stability).

### B. Audio Module (Clarity &amp; Delivery)

* **Tech Stack:** `librosa`, Wav2Vec2 (prosody, intonation), Silero VAD (voice activity, WPM, filler words).

### C. Text/Linguistic Module (Relevance &amp; Content)

* **Tech Stack:** OpenAI `whisper` (speech-to-text), `sentence-transformers` S-BERT (semantic similarity to topic), IndoBERT (argument structure and linguistics).

## 4. Integration &amp; Scoring (Weighted Scoring System)

* **Weights:** * 40% Content Quality (Text)

    * 30% Delivery &amp; Fluency (Audio)

    * 30% Non-Verbal Communication (Video)

* **Output:** The FastAPI endpoint must return a structured JSON containing the synthesized total score and a dictionary of specific, rule-based Actionable Feedback.

## 5. Technical Environment

* **Language:** Python 3.10 (Backend/ML) &amp; TypeScript/JavaScript (Frontend)

* **Code Structure:** * `/frontend`: Next.js application.

    * `/backend`: FastAPI application containing modular directories for `/api` (routes), `/core` (config), `/ml_pipeline` (sub-modules for video, audio, text, and fusion).