Trail Weather answers one question every Friday night: *is this weekend's hike a go?* It pulls an hourly forecast for a trailhead and reduces it to a single call — **go**, **wait**, or **skip** — with the reason underneath.

## Why I built it

Weather apps show everything and decide nothing. I kept opening three of them, squinting at precipitation charts, and still guessing. I wanted the decision, plus enough of the reasoning to trust it.

## How it works

Each trailhead has a profile: elevation gain, exposure, and how long the hike takes. The forecast for the hiking window is scored against a few rules:

- Lightning risk anywhere in the window → **skip**
- More than 40% rain chance in the first two hours → **wait**
- Wind above 30 mph on an exposed ridge → **skip**
- Otherwise → **go**

```ts
type Call = "go" | "wait" | "skip";

function decide(window: HourlyForecast[], trail: Trail): Call {
  if (window.some(h => h.thunder > 0.1)) return "skip";
  if (trail.exposed && window.some(h => h.gustMph > 30)) return "skip";
  if (window.slice(0, 2).some(h => h.rainChance > 0.4)) return "wait";
  return "go";
}
```

## What I learned

Rules beat a weighted score here. I tried a 0–100 "hike score" first; nobody (including me) knew whether 62 meant go. Three named outcomes made the app useful.

The data side connects to [[commute-data]] — same habit of logging outcomes, then checking whether my rules were right.

## Next

- Push notification on Friday at 6 pm
- Sunrise / sunset in the hiking window
