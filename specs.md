# Professor's Lab: Spec-Driven Roadmap

## Project Vision
A Pokémon Team Builder where AI is not just a generator, but a strategic "Professor" that validates designs and provides tactical depth.

## Core Pillars
1. **Spec-Driven Generation**: Users provide natural language requirements; AI synthesizes DNA.
2. **Design Validation**: The AI explains its design choices through "Synthesis Reports."
3. **Tactical Synergy**: Real-time battle advice with visual HUD integration.

## Implementation Status

### Phase 1: Foundation (Completed)
- [x] Basic Pokédex and Team Management.
- [x] Local Storage via IndexedDB.
- [x] Basic AI Generation (Gemini 3 Flash).

### Phase 2: The Laboratory (Completed)
- [x] **Task 2.1**: Implement Spec-Driven DNA Lab.
- [x] **Task 2.2**: Add Lore and Stats generation via JSON schemas.
- [x] **Task 2.3**: Create "Synthesis Report" for design verification.
- [x] **Task 2.4**: Upgrade Laboratory UI with scanning animations.

### Phase 3: Battle Frontier & Polish (Completed)
- [x] AI Battle Advice (Text-based).
- [x] **Task 3.1**: Visual Battle HUD (Move Highlighting).
- [x] **Task 3.2**: Game Corner "Token Wheel" Overhaul.
- [x] **Task 3.3**: Post-Battle Analysis from the Professor.

### Phase 4: Mission HQ (Current)
- [ ] **Task 4.1**: Daily Mission Engine (24h Reset & IDB Store).
- [ ] **Task 4.2**: Progress Tracking (Hooks for Battle/Capture/Sell).
- [ ] **Task 4.3**: Reward Claiming System.

## Technical Standards
- **Model**: `gemini-3-pro-preview` for complex reasoning (Specs & Analysis).
- **Styling**: Tailwind CSS with custom Laboratory theme (Cyan/Purple).
- **Architecture**: Modular React components with strict TypeScript interfaces.
