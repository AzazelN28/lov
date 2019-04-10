# Legends of Valour Web

This is a web reimplementation of the 1992 Legends of Valour game. One of the first sandbox RPGs and one of the first RPGs I played in my old 286. Created by Kevin Bulmer and Ian Downend, I was so impressed that I can say without doubt that this was one of the games that made me interested in computer science.

Right now the source code its pretty messy.

## Reverse Engineering

If you're interested in reverse engineering this game, these are some tips you can find useful:

- All the .FCB files are, in fact, .LBM files (created with Deluxe Paint) and I'm not sure but I think that can be opened with Deluxe Paint. Also there is a Linux app called `ilbmtoppm` that can help you transform the .FCB files in something more useful (this is what I used to extract all the sprites and textures).
- The MAP#0009.DAT contains all the map information. The letter after MAP represents the height level (U for underground, G for ground and F for flat? floor?). The map is a grid of 85x128 tiles and every tile consists of three bytes.
- All the texts are contained in the RUN.EXE.
- I'm not sure but I think that the .FAB files are somekind of simplified .FCB files with images of every letter and poster found in the taverns, hostels, etc.

### Places

#### Prisons

P1 Turret Jail
P2 Castle Dungeon
P3 Hireling Prison
P4 The Brig
P5 Twon Gaol

#### Taverns

B1 The Dragons Head
B2 The Trolls Arms
B3 The Hanged Man
B4 The Jug of Ale
B5 The Casino
B6 The Seahorse Tavern
B7 The Mermaids Rest
B8 The Snakes

#### Hostels

H1 The Waifs Rest
H2 Dead Mans Inn
H3 The Flea Pit
H4 The Travellers Inn
H5 The Boardings
H6 The Hermits Repose
H7 The Thespians Tavern
H8 The Seamens Lodgings

#### Shops

TODO: Put in here the shops and the other elements of the map

Made with :heart: by [AzazelN28](https://github.com/AzazelN28)
