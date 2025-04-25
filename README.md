# Game Torrent Scraper

A Node.js scraper designed to extract metadata and download torrents of PlayStation 4 games from [love-games1.net](https://love-games1.net). This project efficiently handles multiple pages and skips existing downloads.

## Features

- Scrapes game metadata (e.g., year, genre, disk code, etc.)
- Downloads torrent files for each game
- Skips downloads if the file already exists
- Logs metadata to a `info.txt` file
- Ensures efficient processing with asynchronous functions

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/game-torrent-scraper.git
   cd game-torrent-scraper
