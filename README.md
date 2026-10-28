# 🎃 Haunted Quest — Embedded Questions

A 3D Halloween adventure game for Grade 11 (Mathayom 5) students to practise **English embedded questions** through listening, speaking, spelling and grammar.

**▶ Play:** https://beerkitti1501-web.github.io/beer/

Works on phones, iPads/tablets and computers (Chrome, Edge, Safari, Firefox).

## The adventure

Players are a **Witch Apprentice** with a talkative little ghost (Boo) and a magic pet. They collect 3 **Magic Question Gems** to open the door to the final magic room.

| Level | World | Skill | Reward |
|---|---|---|---|
| 1 | The Haunted Forest | Listening & Speaking: hear the model, speak into the microphone | Voice Crystal |
| 2 | The Spooky Castle | Spelling & Sentence Building: fill blanks, dictation, type full sentences, order word tiles | Spelling Crystal |
| 3 | The Witch's Chamber | Grammar & Logic: Wh-word vs if/whether, fix word order, polite role-play | Grammar Crystal + Halloween Master badge |

### The 3 magic rules
1. Use statement word order — *Could you tell me where he lives?* (not *where does he live*)
2. Choose the Wh-word that matches the meaning — *I wonder where she went.*
3. Use **if / whether** for yes/no questions — *I don't know if she is coming.*

## Features
- 3D world (Three.js): run, jump, dodge traps (rolling pumpkins, ghosts, axes, spikes, fire, flying books)
- Character animations: run, jump, celebrate on correct answers, scared when hit
- **Speaking:** text-to-speech model audio (normal + slow) and speech-to-text checking. *Sentence accuracy* (word-by-word) is shown separately from a *pronunciation estimate* (from recognizer confidence — not an exact pronunciation score)
- **Smart hints** from Boo based on the exact mistake (word order, if/whether, Wh-word, spelling, capital letters, end punctuation)
- **Auto-generated questions** every level: a procedural spell book of 30+ questions; when hosted as a Claude artifact, AI can create a fresh set
- Combo x2 / x3, coins, stars, badges, unlockable outfits and pets
- Progress saved in the browser, with a **Copy My Results** button for sending to the teacher

## Controls
- **Computer:** `W A S D` / arrow keys to move, `Space` to jump, `E` to talk, drag the mouse to turn the camera, scroll to zoom
- **Phone / tablet:** on-screen joystick, ⤒ jump, ✋ talk, swipe to turn the camera

## Microphone notes
Speech recognition works best in **Chrome or Edge** (desktop/Android) and **Safari** (iPhone/iPad) on the HTTPS GitHub Pages link, with an internet connection. If the microphone is unavailable, students can use their keyboard's dictation button (or `Win`+`H` on Windows) to speak into the text box.

## Project structure
```
index.html        ← the built game (single file, served by GitHub Pages)
src/              ← source: template.html, style.css, content.js, engine.js, levels.js, game.js, ui.js, questions.js
build.py          ← combines src/ into index.html
```
Rebuild after editing: `python3 build.py`
