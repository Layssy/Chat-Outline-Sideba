# Chat Outline Sidebar

A Chrome extension that adds a structured outline sidebar to ChatGPT and Gemini, enabling quick navigation and folding of conversation content. Includes a folders feature for organizing ChatGPT conversations.

## Features

- Outline sidebar with clickable message links
- Fold controls for AI responses (individual and bulk)
- Folders for ChatGPT conversations
  - Create folders
  - Assign conversations to folders
  - Filter by folder
  - Delete folders
- Customizable sidebar (position, collapse, background color)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable Developer mode
   - Click “Load unpacked”
   - Select the `dist` directory

## Usage

### Demo

[Add GIF here]

### Outline Sidebar

- The sidebar appears on the right side of supported pages
- Click any item in the outline to scroll to that message
- Use “Fold” or “Expand” for each item
- Use “Fold All Answers” / “Expand All”
- Drag the header to reposition
- Collapse the sidebar with the toggle
- Change background color via the color picker

### Folders (ChatGPT Only)

- A “Folders” panel appears in the left sidebar
- Click “+ New Folder” to create a folder
- Open a conversation’s three-dot menu and select “Assign to folder”
- Click a folder to filter conversations
- Click the “x” next to a folder to delete it

## Supported Sites

- ChatGPT: https://chatgpt.com/*
- Gemini: https://gemini.google.com/*

## Configuration & Persistence

Settings are stored in localStorage:
- Sidebar collapse state
- Sidebar position
- Sidebar background color
- Folders and assignments
- Fold states

Settings persist across sessions on the same browser.

## Troubleshooting

- Sidebar not appearing: refresh after installation
- Folders not visible: only available on ChatGPT
- Features not working: verify extension is enabled, check console errors
- Lost settings: clearing browser data resets storage

## Disclaimer

This is an unofficial extension and is not affiliated with, endorsed by, or associated with OpenAI or Google.
