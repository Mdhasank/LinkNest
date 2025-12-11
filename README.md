# LinkNest 🪹

> **Your private, offline-first digital brain.**  
> Organize links, files, and categories in a beautiful SaaS-style dashboard.

![LinkNest Dashboard](https://via.placeholder.com/1200x600?text=LinkNest+Dashboard)

## 🌟 Features

### 📦 Organization
-   **Categories**: Create custom categories with emoji icons to organize your life (Work, Learning, Tools, etc.).
-   **Sub-categorization**: Group items logically.
-   **Drag & Drop**: Manually reorder items using the dedicated drag handle (`⋮⋮`).
-   **Search**: Instantly filter items by title or URL.

### 💾 Data Management
-   **Local & Private**: All data is stored in your browser's **IndexedDB**. Nothing is sent to a cloud server.
-   **File Storage**: Upload images and documents directly to the dashboard.
-   **Import/Export**: Full JSON backup and restore functionality. Move your data between devices easily.

### 🎨 Modern UI/UX
-   **Dashboard Layout**: Professional sidebar navigation with a collapsible tree view.
-   **Themes**: Toggle between **Deep Dark** 🌑 and **Crisp Light** ☀️ modes.
-   **Responsive**: Fully optimized for mobile devices. Controls move to the sidebar on small screens for a clutter-free experience.
-   **View Modes**: Switch between Grid (Visual) and List (Compact) views.

## 🚀 Getting Started

### Prerequisites
-   A modern web browser (Chrome, Edge, Firefox).
-   Python (optional, only needed for the simple server).

### Installation
1.  **Clone/Download** this repository.
2.  **Run** the application.
    Since this is a client-side app, you just need to serve the `index.html`.
    
    **Option A: Using Python (Recommended)**
    ```bash
    python app.py
    ```
    Then open `http://localhost:5000`

    **Option B: Direct Open**
    You can also just open `index.html` directly in your browser, though some file features might be restricted by browser security policies.

## 🛠️ Usage Guide

### Managing Items
1.  Click **+ New Item** in the sidebar.
2.  Enter a Title.
3.  **Required**: You must provide either a **Link URL** or upload a **File**.
4.  Select a Category (or leave as Uncategorized).

### Managing Categories
-   **Create**: Click `📂 New Category`, enter a name and pick an emoji.
-   **Filter**: Click a category name in the sidebar to view only those items.
-   **Delete**: Hover over a category in the sidebar and click the **`✕`** button to remove it. Items will move to "Uncategorized".

### Backup & Restore
1.  Click **Data & Backup** in the sidebar.
2.  **Export**: Download your entire database as a `.json` file.
3.  **Import**: Upload a backup file to restore or merge data.

## ⚠️ Important Note
**LinkNest stores data locally in your browser.**
-   If you clear your browser cache/site data, **you will lose your items**.
-   **Do not use Incognito Mode** if you want your data to persist.
-   **BACKUP REGULARLY** using the Export feature.

## 📱 Mobile Experience
On mobile devices:
-   The sidebar is accessible via the hamburger menu.
-   Theme and View controls are moved to the bottom of the sidebar.
-   The interface is touch-optimized with larger tap targets.

---

*Built with Vanilla JS, HTML5, and CSS3. No framework bloat.*