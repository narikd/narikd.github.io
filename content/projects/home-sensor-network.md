Six small sensor nodes around the house report temperature and humidity every five minutes to a Raspberry Pi in the closet. The goal was a year of battery life per node on two AA cells.

## Hardware

Each node is an ESP32 with a LoRa radio and an SHT31 sensor on a hand-soldered perfboard. Deep sleep between readings keeps the average draw low.

| Part | Role | Cost |
|---|---|---|
| ESP32-C3 | Microcontroller | $4 |
| SX1276 | LoRa radio | $6 |
| SHT31 | Temp / humidity | $3 |
| 2× AA holder | Power | $1 |

## Status

Paused. Four nodes have run for seven months; two died early from a sleep-mode bug I haven't tracked down. Picking this up again this winter.

## Lessons

- Measure current draw in deep sleep **before** building six of anything.
- LoRa is overkill indoors, but the range made placement painless.
