import { Song } from '../types';

export const INITIAL_SONGS: Song[] = [
  {
    id: 'sample-1',
    user_id: 'demo-user',
    title: 'Wish You Were Here',
    artist: 'Pink Floyd',
    key: 'G',
    bpm: 60,
    favorite: true,
    pinned: true,
    tags: ['English', 'Classic Rock', 'Acoustic'],
    original_chord_sheet_url: 'https://www.ultimate-guitar.com/pro/?artist=Pink+Floyd&song=Wish+You+Were+Here',
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    content: `[Intro]
[C] [D] [Am] [G]
[C] [D] [Am] [G]

[Verse 1]
[C] So, so you think you can [D]tell
Heaven from [Am]hell, blue skies from [G]pain
Can you tell a green [D]field from a cold steel [C]rail?
A smile from a [Am]veil? Do you think you can [G]tell?

[Verse 2]
Did they get you to [C]trade your heroes for [D]ghosts?
Hot ashes for [Am]trees? Hot air for a [G]cool breeze?
Cold comfort for [D]change? Did you ex[C]change
A walk on part in the [Am]war for a lead role in a [G]cage?

[Solo]
[C] [D] [Am] [G]
[C] [D] [Am] [G]

[Chorus]
[C] How I wish, how I wish you were [D]here
We're just [Am]two lost souls swimming in a fish bowl [G]year after year
[D] Running over the same old ground, [C] what have we found?
The same old [Am]fears, wish you were [G]here

[Outro]
[C] [D] [Am] [G]
[C] [D] [Am] [G]`
  },
  {
    id: 'sample-2',
    user_id: 'demo-user',
    title: 'Kabira',
    artist: 'Tochi Raina & Rekha Bhardwaj',
    key: 'G',
    bpm: 88,
    favorite: true,
    pinned: true,
    tags: ['Hindi', 'Bollywood', 'Acoustic', 'Sufi'],
    original_chord_sheet_url: 'https://chords.guitartabs.cc/tab/tochi-raina/kabira',
    created_at: new Date(Date.now() - 3600000 * 24 * 2.5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24 * 2.5).toISOString(),
    content: `[Intro]
[G] [D] [Em] [C]

[Chorus]
Baanjh [G]rahe na koi [D]aash,
Kaisi [Em]teri ye talash [C]
Kaise [G]itni tu udaas, [D]o Ka[Em]bira [C]

Man [G]ja re o Ka[D]bira,
Man [Em]ja re o Ka[C]bira
Aise [G]tu na tu machal [D]ja,
Aise [Em]tu na badal [C]ja!

[Verse 1]
[G] Re Kabira maan [D]ja, [Em] re Kabira maan [C]ja
[G] Tera raasta [D]alag hai, [Em] tera rasta alag [C]hai
[G] Tu chal de apne [D]raaste, [Em] na dekh peeche [C]mudke!`
  },
  {
    id: 'sample-3',
    user_id: 'demo-user',
    title: 'Hallelujah',
    artist: 'Jeff Buckley',
    key: 'C',
    bpm: 56,
    favorite: true,
    pinned: false,
    tags: ['English', 'Folk', 'Ballad'],
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    content: `[Intro]
[C] [Am] [C] [Am]

[Verse 1]
I've [C]heard there was a [Am]secret chord
That [C]David played, and it [Am]pleased the Lord
But [F]you don't really [G]care for music, [C]do you? [G]
It [C]goes like this, the [F]fourth, the [G]fifth
The [Am]minor fall, the [F]major lift
The [G]baffled king com[E7]posing Halle[Am]lujah

[Chorus]
Halle[F]lujah, Halle[Am]lujah
Halle[F]lujah, Halle[C]lu--[G]ja--[C]h [G]`
  },
  {
    id: 'sample-4',
    user_id: 'demo-user',
    title: 'Tum Hi Ho',
    artist: 'Arijit Singh',
    key: 'Fm',
    bpm: 80,
    favorite: false,
    pinned: false,
    tags: ['Hindi', 'Bollywood', 'Romance'],
    original_chord_sheet_url: 'https://chords.guitartabs.cc/tab/arijit-singh/tum-hi-ho',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    content: `[Intro]
[Fm] [Db] [Eb] [C]

[Chorus]
Hum[Fm]tere bin ab reh nahi [Db]sakte
Tere [Eb]bina kya wajood me[C]ra
Tujh[Fm]se juda agar ho jaa[Db]yenge
Toh khud [Eb]se hi ho jaayenge ju[C]da

Kyunki [Fm]tum hi ho, ab [Bbm]tum hi ho
Zin[Eb]dagi ab tum hi [Ab]ho [C]
Chain [Fm]bhi, mera [Bbm]dard bhi
Meri [Eb]aashiqui ab tum hi [Fm]ho!`
  },
  {
    id: 'sample-5',
    user_id: 'demo-user',
    title: 'Wonderwall',
    artist: 'Oasis',
    key: 'Em',
    bpm: 87,
    favorite: false,
    pinned: false,
    tags: ['English', '90s Pop', 'Rock'],
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    content: `[Capo 2nd fret]

[Intro]
[Em7] [G] [Dsus4] [A7sus4]  (x4)

[Verse 1]
[Em7] Today is [G]gonna be the day that they're [Dsus4]gonna throw it back to [A7sus4]you
[Em7] By now you [G]should've somehow real[Dsus4]ized what you gotta [A7sus4]do
[Em7] I don't believe that [G]anybody [Dsus4]feels the way I [A7sus4]do
About you [Cadd9]now [Dsus4] [A7sus4]`
  }
];
