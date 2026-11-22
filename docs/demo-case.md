# Demo case: Ada (invented)

An **invented** person used by the public demo and the portfolio version, so no real health data is ever published. Ada, the brands (Plain Theory, Fernwell, Norra, Halden Lab) and the products are fictional. The ingredient names are real INCI names, so the engine can read them; any resemblance to a real product is accidental.

Data: `src/data/demo-case.ts` · Test: `src/engine/demo-case.test.ts`

## Profile
- Combination skin. Wants to improve comedones, redness and dark spots.
- Exercise on Mondays and Thursdays. Make-up some days a week.
- Breakouts mostly on the forehead and cheeks. Marks stay after spots (**T2**).
- Uses an LED mask most nights (the routine always includes the LED step after cleansing, R11).

## The situation
Ada has been adding products for a year: three exfoliants a week on top of a salicylic cleanser, two vitamin C serums, retinol and a benzoyl peroxide spot gel, a rich night cream, and **no sunscreen**. A good example of a routine that does too much at once.

## Products
| Product | Brand | Type | Uses/week |
|---|---|---|---|
| Gentle Foaming Cleanser | Plain Theory | cleanser | 14 |
| Clarifying Salicylic Wash | Fernwell | cleanser (BHA) | 7 |
| Melting Cleansing Balm | Fernwell | oil cleanser | 3 |
| Glow Tonic 5% Glycolic | Norra | toner (AHA) | 5 |
| Bright C 15% Serum | Halden Lab | serum (vitamin C) | 7 |
| C-Boost Drops | Norra | serum (vitamin C, niacinamide) | 7 |
| Niacinamide 10% Serum | Plain Theory | serum | 7 |
| Daily Gel Moisturiser | Plain Theory | moisturiser | 14 |
| Cooling Water Cream | Plain Theory | moisturiser (summer, morning) | – |
| Rich Repair Night Cream | Norra | moisturiser | 7 |
| Azelaic 10% Cream | Plain Theory | treatment (azelaic) | 4 |
| BHA Pore Liquid 2% | Plain Theory | treatment (BHA) | 3 |
| Retinol 0.3% Night Serum | Halden Lab | treatment (retinoid) | 3 |
| Spot Gel 5% Benzoyl Peroxide | Fernwell | treatment (BPO) | 3 |
| Exfoliating Peel 25% | Norra | peel (AHA + BHA) | 1 |
| Second Skin Foundation | Halden Lab | make-up | – |

## Expected results
1. **Triage:** T2 → fixed "worth having a professional look at it" alert.
2. **R4:** weekly exfoliation load 33 (reduce from 12) → too much.
3. **R7:** BHA repeated (wash, liquid, peel); AHA repeated (tonic, peel).
4. **Vitamin C twice:** Bright C + C-Boost → pause one.
5. **R5:** acids and retinol with no sunscreen → sunscreen every morning.
6. **R3:** benzoyl peroxide and retinol → never together.
7. **Product notes:** balm C1 + C4 + fragrance; night cream C1 + C2 + C3; foundation C5 + alcohol; tonic alcohol; wash fragrance.
8. **Reset pauses:** balm, night cream (ingredients to watch), salicylic wash, peel, tonic (exfoliation), C-Boost (repeated vitamin C). Exfoliation drops to 6 a week.
9. **Reintroduction order:** C-Boost → glycolic tonic → cleansing balm → night cream. The wash and the peel are not reintroduced: they repeat an exfoliant already kept.
