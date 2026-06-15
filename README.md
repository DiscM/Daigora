# 🌍 Heal the Planet

An interactive, strategic planetary management card game built using **React**, **TypeScript**, and **Vite**. As the lead administrator of the Earth Council, your mission is to guide the planet through **20 critical turns** of escalating environmental, economic, and social crises. Build trust, repair ecosystems, maintain economic flow, and coordinate international policy to prevent a final, cascading global collapse.


## ⚙️ Core Game Mechanics

### 1. The Game Loop
* **Length:** Exactly **20 turns**.
* **Goal:** Keep the **Planet Health** (starts at 24/24) above `0` through all 20 turns and survive the devastating Final Cascading Crisis.
* **Flow of a Turn:**
  1. **Crisis Phase:** A new Crisis Card is drawn and resolved. Baseline crisis effects and conditional **Calamities** are applied immediately.
  2. **Draw Phase:** You draw 5 cards (minus any draw penalties from the previous turn).
  3. **Play Phase:** Spend your Action Points (AP) and Policy Points (PP) to play cards from your hand.
  4. **End of Turn Phase:**
     * Unprevented pending damage hits Planet Health.
     * System checks for **Readiness Danger States** (indexes $\le 3$) and **Cascading Disasters** (2+ indexes $\le 2$).
     * Non-retained cards are discarded, and you prepare for the next turn.

---

### 2. Readiness Indexes
Your governing capacity is tracked across four core indexes. Each starts at **4** (on a scale of `0` to `10`):

| Index | Icon / Color | Purpose & Vulnerabilities |
| :--- | :--- | :--- |
| **Trust** | Blue | Public support. If $\le 3$, triggers **Mass Apathy** ($-1$ card draw next turn & generates Apathy debuff cards). |
| **Ecology** | Green | Health of biosphere. Low ecology increases damage from climate/habitat crises and causes calamities. |
| **Economy** | Yellow | Flow of capital. If $\le 3$, triggers **Economic Pushback** (all Technology & Policy cards cost $+1$ next turn). |
| **Coordination** | Purple | Bureaucracy and speed. If $\le 3$, triggers **Policy Paralysis** (locks all Policy cards next turn). |

> ⚠️ **Cascading Disaster:** If at any time **two or more indexes** drop to **2 or lower**, you suffer a cascading penalty of **$-2$ Planet Health** and gain an **Apathy** card in your discard pile.

---

### 3. Energy & Resources
* **Action Points (AP):** Your primary currency for playing standard cards. You begin with **3 AP** (Turns 1-5) and scale up to **4 AP** (Turns 6-20).
* **Policy Points (PP):** Earned by playing specific Education or Policy cards. PP is used to fund powerful, structural global policy decisions.

---

### 4. Card Types & Keywords
Your deck consists of Action Cards and Status Cards:

* **Education:** Focuses on raising Trust, drawing cards, generating Policy Points, and cleansing social debuffs like Apathy and Misinformation.
* **Environmental Work:** Cleanses Pollution, restores Ecology, and patches Planet Health.
* **Technology:** Focuses on long-term Economy/Ecology gains, damage prevention, and ongoing mitigation shields.
* **Policy:** Strong structural upgrades. Policy cards cost **PP** instead of AP, and they **Exhaust** upon use.
* **Emergency:** Inexpensive, high-priority emergency shields or healing cards.
* **Status (Debuffs):** Harmful, unplayable cards inserted into your deck by Crises:
  * **Pollution:** When drawn, immediately drains $-1$ AP for the turn.
  * **Apathy:** Contains the **Retain** keyword. It stays in your hand, taking up space and blocking redraws until cleansed.
  * **Misinformation:** When drawn, increases the cost of all Education and Policy cards by $+1$ AP/PP.
  * **Delay:** Next Technology or Policy card loses momentum.
  * **Backlash:** When drawn, costs you $-1$ Trust, then exhausts itself.

#### Card Keywords
* **Draw X:** Instantly pull $X$ cards from your deck.
* **Exhaust:** The card is removed from the cycling deck for the remainder of the game.
* **Ongoing:** Applies a permanent, active effect (e.g., ongoing shield against specific crisis types).
* **Retain:** Kept in hand at the end of the turn rather than discarded.
* **Cleanse:** Removes target Status cards from your hand, deck, or discard pile, moving them to the exhaust pile.

---

### 5. Crises & Calamities
At the start of each turn, a crisis strikes. A crisis has a baseline effect (such as index reductions, damage, or adding Pollution) and a conditional **Calamity**:

* **Calamity Trigger:** If the specified index is **at or below 3**, the calamity occurs, triggering severe extra damage or penalties.
* **Averting Crises:** You can avert crisis damage by:
  * Playing cards with the **Prevent Damage** effect (adds temporary shields).
  * Raising the targeted index above the calamity threshold before the end of the turn.
  * Meeting specific crisis objectives (e.g. playing at least one Environmental card during a *Plastic Waste Surge*).

---

### 6. Advisor Selection (Project Aids)
Choose up to **3 Advisors** during setup to customize your strategy. Each has a powerful passive benefit and a punishing drawback:

* **The Educator (Community Learning Specialist):**
  * *Passive:* First Education card played each turn gives $+1$ Trust.
  * *Drawback:* Technology cards cost $+1$ AP if Trust is below 4.
* **The Ecologist (Habitat & Wildlife Specialist):**
  * *Passive:* Once per turn, when restoring Ecology, restore $+1$ more.
  * *Drawback:* Economy starts 1 point lower.
* **The Engineer (Clean Systems Designer):**
  * *Passive:* First Technology card played each turn costs 1 less AP.
  * *Drawback:* Trust gains are reduced if no Education card is played during the turn.
* **The Policy Advocate (Institutional Strategist):**
  * *Passive:* Gain $+1$ PP whenever a Policy card is played.
  * *Drawback:* If Coordination drops below 3, immediately lose 1 Trust.
* **The Disaster Responder (Emergency Planner):**
  * *Passive:* First crisis damage taken each turn is reduced by 1.
  * *Drawback:* Long-term solution cards do not gain bonus effects.

---

### 7. The Final Crisis & Victory Ratings
At the end of Turn 20, the **Cascading Planetary Crisis** delivers one final blow to your planet. 

* **Base Damage:** **16 damage** is dealt to Planet Health.
* **Mitigation (High Readiness):**
  * **$-3$ damage** if Trust $\ge 5$
  * **$-4$ damage** if Ecology $\ge 5$
  * **$-3$ damage** if Economy $\ge 5$
  * **$-4$ damage** if Coordination $\ge 5$
  * **$-3$ extra damage** if **all** indexes are $\ge 5$
* **Escalation (Low Readiness):**
  * **$+3$ damage** if any index is $\le 2$
  * **Immediate $-3$ Planet Health** if 2 or more indexes are $\le 2$

#### Victory Ratings
Your final standing is calculated based on remaining Planet Health and your Readiness indexes:

| Victory Rating | Requirements |
| :--- | :--- |
| **Regenerative Future** | Planet Health $> 10$ and all indexes $\ge 9$. |
| **Resilient Future** | Planet Health $> 0$ and all indexes $\ge 5$. |
| **Stabilization** | Planet Health $> 0$ and at least 2 indexes $\ge 5$. |
| **Survival** | Planet Health $> 0$ and 3 or more indexes $< 5$. |
| **Collapse** | Planet Health $\le 0$ at any point. |

---

## 🛠️ Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Run Development Server:**
   ```bash
   npm run dev
   ```
3. **Run Unit & Engine Tests:**
   ```bash
   npm run test
   ```
