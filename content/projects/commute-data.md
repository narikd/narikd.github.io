For two years I logged every commute: departure time, route, and arrival. About 900 trips later, the question was simple — does leaving ten minutes earlier actually save time?

## Findings

Mostly, yes. Leaving before 7:40 cut the median trip by six minutes and, more usefully, cut the worst trips almost in half. Variability mattered more than the average.

> The early trip wasn't much faster. It was much more *predictable*.

## Method

Trips were logged with a phone shortcut writing to a CSV. Analysis in pandas; charts in Observable Plot.

```python
df["late_start"] = df.depart.dt.time > time(7, 40)
df.groupby("late_start").minutes.describe(percentiles=[.5, .9])
```

## Related

The same habit of logging and checking shows up in [[trail-weather]].
