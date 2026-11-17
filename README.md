# koi

A dark koi pond behind your chats in the Claude desktop app. Pixel-art fish swim slow loops under lily pads, and the chat stays readable on top.

## What you'll see

- **A new lineup every day.** Two everyday koi breeds and two fancy koi, one of them a big parent. There are 24 everyday breeds and 12 fancy koi, so the pond rarely looks the same two days running.
- **Visitors.** A glowing school fish, a glowing fish and a see-through ghost swim by every day.
- **Rare fish.** Two rares, a very rare and a legend cross the pond now and then. Most of the time they're away, so catching one is the fun part.
- **Lilies that keep time.** They open by day and close into buds at night, following New York's sunrise and sunset.
- **Night.** After sunset the pond goes dark blue, the lily buds glow, and the glowing fish shine brighter. Dawn and dusk get their own tints.
- **Rain and snow.** When it's raining or snowing in New York, drops ring the water or flakes drift down over the pond.
- **Fish that grow.** They get a little bigger over their first few weeks in your pond.

## Install

In a terminal session of Claude Code:

```
/plugin install koi --marketplace worthybrae/koi-pond
```

Answer `y` to add the marketplace, then press Enter to install for your user. From a shell instead:

```bash
claude plugin install koi --marketplace worthybrae/koi-pond
```

In the desktop app, where `/plugin` doesn't run: click + next to the prompt box, then Plugins, then Add marketplace with `worthybrae/koi-pond`, then Add plugin.

The pond shows in sessions you start after installing.

## Using it

The pond turns on by itself in every new session.

- `/koi off` turns it off. New sessions stay off until you turn it back on.
- `/koi` turns it back on.

It only draws in the desktop app. The terminal and other surfaces are left alone.

## Good to know

- **Reduce motion.** If your system has reduce motion turned on, the fish stop swimming and hold still on the pond instead, and rain and snow don't show.
- **CPU.** It's animated, so it costs something while it's on screen: roughly one CPU core on a 120 Hz display in our tests, a bit more at night and while it snows. If your laptop runs warm, `/koi off` stops it.
- **Network.** Every 15 minutes it asks [Open-Meteo](https://open-meteo.com) for New York's weather, sunrise and sunset. It sends nothing about you, just the fixed New York coordinates. If it can't reach the service, the pond carries on with the last reading it had.

## License

MIT. See [LICENSE](LICENSE).
