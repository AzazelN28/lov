# Legends of Valour Web

This is a web reimplementation of the 1992 Legends of Valour game. One of the first sandbox RPGs and one of the first RPGs I played in my old 286. Created by Kevin Bulmer and Ian Downend, I was so impressed that I can say without doubt that this was one of the games that made me interested in computer science.

Right now the source code its pretty messy.

## Reverse Engineering

If you're interested in reverse engineering this game, these are some tips you can find useful:

- All the .FCB files are, in fact, .LBM files (created with Deluxe Paint) and I'm not sure but I think that can be opened with Deluxe Paint. Also there is a Linux app called `ilbmtoppm` that can help you transform the .FCB files in something more useful (this is what I used to extract all the sprites and textures).
- The MAP#0009.DAT contains all the map information. The letter after MAP represents the height level (U for underground, G for ground and F for flat? floor?). The map is a grid of 85x128 tiles and every tile consists of three bytes.
- All the texts are contained in the RUN.EXE.
- I'm not sure but I think that the .FAB files are somekind of simplified .FCB files with images of every letter and poster found in the taverns, hostels, etc.

### Commodities

| Commodity | Measured in |
|:----------|:--------|
| Gems     | Ounces |
| Spices   | Pounds
| Pigments | Pots
| Ore      | Cwts
| Hide     | Pelts
| Tar      | Kegs

### Places

#### Prisons

- P1 Turret Jail
- P2 Castle Dungeon
- P3 Hireling Prison
- P4 The Brig
- P5 Twon Gaol

#### Taverns

- B1 The Dragons Head
- B2 The Trolls Arms
- B3 The Hanged Man
- B4 The Jug of Ale
- B5 The Casino
- B6 The Seahorse Tavern
- B7 The Mermaids Rest
- B8 The Snakes

#### Hostels

- H1 The Waifs Rest
- H2 Dead Mans Inn
- H3 The Flea Pit
- H4 The Travellers Inn
- H5 The Boardings
- H6 The Hermits Repose
- H7 The Thespians Tavern
- H8 The Seamens Lodgings

### Guilds

There are five guilds, each guild has five levels. You need to complete a mission to reach the next level.

#### Mercenaries Guild

| Level | Name |
|:-----:|:-----|
| 1 | Bodyguard's Apprentice |
| 2 | Hireling |
| 3 | Bounty Hunter |
| 4 | Mercenary |
| 5 | Guildmaster |

#### Men-At-Arms Guild

| Level | Name |
|:-----:|:-----|
| 1 | Grunt |
| 2 | Trooper |
| 3 | Weaponsmith |
| 4 | Captain |
| 5 | Templar |

#### Thieves Guild

| Level | Name |
|:-----:|:-----|
| 1 | Beggar |
| 2 | Pickpocket |
| 3 | Graverobber |
| 4 | Thief |
| 5 | Godfather |

#### Fellowship of the Asegeir

| Level | Name |
|:-----:|:-----|
| 1 | Spellbrewer Assistant |
| 2 | Scribe |
| 3 | Spellcaster |
| 4 | Wizard |
| 5 | Wizard Master |

#### Brotherhood of Loki

| Level | Name |
|:-----:|:-----|
| 1 | Mystic |
| 2 | Sorcerer |
| 3 | Spellbinder |
| 4 | Wizard |
| 5 | Warlock |

### Temples

There are four temples: Odin, Freya (only for women), Aegir and Set.

#### Temple of Odin

| Level | Name |
|:-----:|:-----|
| 1 | Neophyte |
| 2 | Magus |
| 3 | Theurgist |
| 4 | Spirit Exorcist |
| 5 | High Priest |

#### Temple of Freya

| Level | Name |
|:-----:|:-----|
| 1 | Flirt |
| 2 | Coquette |
| 3 | Temptress |
| 4 | Seducer |
| 5 | High Priestess |

#### Temple of Aegir

| Level | Name |
|:-----:|:-----|
| 1 | Novice |
| 2 | Theologian |
| 3 | Divine Mediator |
| 4 | Cleric |
| 5 | High Priest |

#### Temple of Set

| Level | Name |
|:-----:|:-----|
| 1 | Wriggler |
| 2 | Hisser |
| 3 | Crusher |
| 4 | Striker
| 5 | Venom Master |

### Spells

These are the spells you can cast depending if you're using Magic (learned in the guilds) or Priestly Magic (learned in temples). They're basically the same spells with different name.

| Magic | Priestly Magic |
|:-----:|:------:|
| Portal | Portal |
| Fireball | Lightning Bolt |
| Create Food | Create Food |
| Create Drink | Create Drink |
| Warp | Sanctuary |
| Heal | Faith Heal |
| Power | Power |
| Protection | Protection |

### Offenses

| Offense | When... |
|:-------|:-------|
| Acting Suspiciously | ... walk randomly? |
| Vagrancy | ... walk randomly? |
| Excessive Snooping | ... you look to much through a window |
| Attempted Robbery | ... you try to pick pocket someone |
| Beastly Behaviour | ... you get transformed into a werewolf |
| Drunk & Disorderly | ... you walk around drunk |
| Assaulting an officer | ... you attack an officer |
| Rent Arrears | ... you don't pay your rent |
| Gambling Debts | ... you don't pay your debts |
| Handling Stolen Goods | ... you go around with stolen goods |
| Threatening Behaviour | ... you insult somebody |

### Enhancements

These is a list of things I would love to improve:

- Better day/night cycle
- Better item management
- Better combat system
- Better dialogue system

Made with :heart: by [AzazelN28](https://github.com/AzazelN28)
