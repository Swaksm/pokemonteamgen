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

### Phase 4: Mission HQ (Completed)
- [x] **Task 4.1**: Daily Mission Engine (24h Reset & IDB Store).
- [x] **Task 4.2**: Progress Tracking (Hooks for Battle/Capture/Sell).
- [x] **Task 4.3**: Reward Claiming System.

### Phase 5: Casino Expansion (Current)
- [x] **Task 5.1**: "Binary Prediction" (Heads or Tails) Wagering Engine.
- [x] **Task 5.2**: Interactive Betting UI with balance validation.
- [x] **Task 5.3**: CSS-based Coin Flip Animation.

---

## Methodology: Binary Flip (Pile ou Face)

### 1. Game Mechanics
- **Probability**: Strict 50/50 distribution using `Math.random()`.
- **Wagering**: Users commit a variable amount of tokens ($X$).
- **Multipliers**:
  - **Win**: $X \times 2.0$ (Double).
  - **Loss**: $X \times 0.0$ (Bust).
- **Validation**: System must check `currentBalance >= betAmount` before initiation.

### 2. Visual Design Specification
- **Theme**: Cyber-Casino aesthetic using `Cyan-500` (Heads) and `Purple-500` (Tails).
- **Coin Asset**: 
  - **Heads**: Stylized Pokeball icon.
  - **Tails**: Minimalist "T" symbol.
- **Animation**: 
  - 2-second high-speed CSS rotation (`spin_linear_infinite`).
  - Scale transform (1.25x) during active prediction to simulate physical flip.

### 3. User Experience (UX)
- **Fast Betting**: Implementation of "Half" and "Max" buttons to minimize friction.
- **Immediate Feedback**: Balance updates instantly upon result resolution to maintain high engagement.
- **Anti-Spam**: Button disabling during animation to prevent race conditions in token updates.

## Technical Standards
- **Model**: `gemini-3-flash-preview` for generation and rapid UI response.
- **Styling**: Tailwind CSS with custom Laboratory theme (Cyan/Purple).
- **Architecture**: Modular React components with strict TypeScript interfaces.
