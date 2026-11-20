/**
 * Side quests: dares that pop up during a crawl. Written for this app, not generated, so every one can be checked
 * against the safety rules in scripts/check_quests.py.
 *
 * The tone is for adults (19+): flirty, confessional, cheeky and bar-wise. The lines it never crosses:
 *  - nothing about how much, how fast or how strong someone drinks, and nothing that needs a few drinks first;
 *  - no running, climbing, jumping or anything near traffic, water or fire;
 *  - everything between people needs consent: ask first, back off at the first no, never film anyone who has not agreed;
 *  - always skippable, and chaos points are never earned for drinking.
 * Flirt, confession and toast quests only appear after the one-time 19+ confirmation.
 */
export type QuestCategory =
  | 'hype'
  | 'flirt'
  | 'confess'
  | 'stranger'
  | 'bounty'
  | 'game'
  | 'mission'
  | 'director'
  | 'timed'
  | 'local'
  | 'toast'
  | 'heart';
export type QuestMedia = 'photo' | 'video' | 'either' | 'none';
export type QuestPlace = 'any' | 'bar' | 'food' | 'view' | 'activity';

export type Quest = {
  id: string;
  text: string;
  cat: QuestCategory;
  media: QuestMedia; // what to capture; 'none' quests can still be marked done
  level: 1 | 2 | 3; // 1 chill, 2 spicy, 3 chaos
  group: 'any' | 'group'; // 'group' needs friends along
  place: QuestPlace; // best at this kind of stop
  drink: boolean; // adult-only (19+): offered only after the age confirmation
  seconds?: number; // a timed quest has a clock to beat
};

type Row = [text: string, media: QuestMedia, level: 1 | 2 | 3, group?: 'any' | 'group', place?: QuestPlace, seconds?: number];

const ADULT: QuestCategory[] = ['flirt', 'confess', 'toast'];

const make = (cat: QuestCategory, rows: Row[]): Quest[] =>
  rows.map(([text, media, level, group = 'any', place = 'any', seconds], i) => ({
    id: `${cat}-${String(i + 1).padStart(2, '0')}`,
    text,
    cat,
    media,
    level,
    group,
    place,
    drink: ADULT.includes(cat),
    seconds,
  }));

// Showtime: a performance for the table.
const hype: Row[] = [
  ["Walk into the next stop like it's the final scene of a heist movie. Slow motion, sunglasses on if you have them, friends film.", 'video', 2, 'group'],
  ["Make the smoothest bar entrance of your life. A friend films from the doorway and scores it out of 10.", 'video', 2, 'group'],
  ["Narrate a friend's night like a true-crime documentary: 'Nobody suspected the nachos.'", 'video', 2, 'group'],
  ["Give an announcement speech that sounds like a wedding speech but is about something completely ridiculous.", 'video', 2],
  ["Sing the chorus of a power ballad to the table with total commitment and zero irony.", 'video', 3, 'group'],
  ["Deliver an Oscar speech for Best Performance in a Group Chat. Thank your exes if you must.", 'video', 2, 'group'],
  ["Two friends stage a soap-opera breakup over the last fry. Slaps are imaginary. Gasps are real.", 'video', 3, 'group'],
  ["Give a dramatic I'm-quitting-my-job speech, then immediately take it all back.", 'video', 2],
  ["Record the voice-over trailer for tonight: 'This winter, one table will change everything.'", 'video', 2, 'group'],
  ["Pose for a perfume advert: lean, stare, whisper the brand name 'Regret'.", 'photo', 2],
  ["Give the group a motivational pep talk that begins with 'Look at me' and ends in tears of laughter.", 'video', 2, 'group'],
  ["Call the next order like a sports-bar announcer. Cheering from the group is mandatory.", 'video', 2, 'group', 'bar'],
  ["Deliver a villain monologue explaining why you are choosing the next bar.", 'video', 2],
  ["Strike a pose for a 90s R&B album cover. Title and tracklist required.", 'photo', 2, 'group'],
  ["Slow-clap a friend into giving a speech. Make the slow-clap contagious.", 'video', 2, 'group'],
  ["Duet a love ballad with a friend at the table, deadpan, as if it's the last song at a wedding.", 'video', 3, 'group'],
  ["Read your most recent note on your phone like it's a poem. Edit lines on the spot if you must.", 'video', 2],
  ["Take a mugshot-style group photo. The crime: being too good-looking for this venue.", 'photo', 1, 'group'],
  ["Make a wanted poster for your group on a napkin: names, crimes, rewards.", 'photo', 2, 'group'],
  ["Perform the worst magic trick in history and take a deep bow.", 'video', 2],
  ["Re-enact your worst night out in 20 seconds with no words.", 'video', 3, 'group'],
  ["Give a speech about the person who planned tonight and apologise for everything on their behalf.", 'video', 2, 'group'],
];

// Flirt: charm, banter and compliments. Kind, consensual, easy to skip. Back off at the first no.
const flirt: Row[] = [
  ["Give a sincere, specific compliment to someone who looks great tonight. Smile, say it, and let it land. No follow-up needed.", 'none', 3],
  ["Deliver your best pickup line to a friend as if it were Shakespeare. They score it out of 10.", 'video', 2, 'group'],
  ["Write the worst pickup line you can on a napkin and read it to a friend in your smoothest voice.", 'video', 2, 'group'],
  ["Send a table fries or dessert with a friendly note, 'from the table by the window'. Ask staff first and keep it light.", 'photo', 3, 'any', 'food'],
  ["Give a friend a movie-style love confession. They must answer in character.", 'video', 2, 'group'],
  ["Pretend you are on a first date with the friend across from you. Use only first-date small talk for 90 seconds.", 'video', 2, 'group'],
  ["Read the menu aloud like a smooth late-night radio host. Best voice in the group wins.", 'video', 2, 'group', 'food'],
  ["Pay a stranger a compliment about something they chose: a drink, a jacket, a laugh. If they smile, take a bow.", 'none', 2],
  ["Ask the bartender to play a song for the table that looks most like they are having the best night, if they take requests.", 'none', 2, 'any', 'bar'],
  ["Speed-date your own group: 30 seconds per pair, only terrible questions. Rank the best flirt.", 'video', 2, 'group'],
  ["Slow-dance with a friend who is up for it, as dramatically as possible, for 20 seconds. Film it.", 'video', 3, 'group'],
  ["Write each friend's dating-app bio in three lines. Read them out. They get a veto.", 'none', 2, 'group'],
  ["Give each friend a green flag and a red flag as if they were a dating profile. Keep it loving.", 'none', 2, 'group'],
  ["Tell the group your biggest dating-app disaster. The best story picks the next song.", 'none', 2, 'group'],
  ["Rank everyone in the group by who would win a reality dating show. Defend the winner.", 'none', 2, 'group'],
  ["Ask a couple nearby how they met, only if they look happy to chat. Toast their story.", 'none', 2],
  ["Pose for the cover of a steamy romance novel. Title, tagline and dramatic hair required.", 'photo', 2, 'group'],
  ["Plan the perfect first date for two friends using only the places on tonight's route.", 'none', 1, 'group'],
  ["With a friend's blessing, be their hype person for ten minutes: tell the table why they are a catch.", 'none', 3, 'group'],
  ["Stage a dramatic proposal with a napkin ring to a friend who is in on it. Film the reaction.", 'video', 3, 'group'],
  ["Describe your type in three words, then your actual last crush in three words. The group gives a verdict.", 'none', 3, 'group'],
  ["Compliment three people in your group in the style of a nature documentary narrator. Keep it respectful.", 'video', 2, 'group'],
];

// Confess: truths and dares between friends. Everyone may pass; nobody has to answer.
const confess: Row[] = [
  ["Everyone confesses their most embarrassing night-out story. The worst one picks the next song.", 'none', 2, 'group'],
  ["Reveal your guilty-pleasure song and sing the chorus.", 'video', 2, 'group'],
  ["Confess your biggest red flag with a straight face. The group gives you a green flag in return.", 'none', 2, 'group'],
  ["Reveal your worst job, worst date or worst haircut. The group votes on the best story.", 'none', 2, 'group'],
  ["Tell the group about the last time you cried laughing.", 'none', 1, 'group'],
  ["Everyone names a celebrity crush. The group guesses whose is whose first.", 'none', 2, 'group'],
  ["Describe your ideal Saturday night in three sentences. The group says if you are lying.", 'none', 2, 'group'],
  ["Two truths and a lie, all three about dating or relationships.", 'none', 2, 'group'],
  ["Reveal the most spontaneous thing you have ever done. The group rates it.", 'none', 2, 'group'],
  ["Show the group the weirdest photo on your phone that you are happy to share.", 'photo', 3, 'group'],
  ["Everyone shares a hot take that might start an argument. The best argument wins.", 'none', 2, 'group'],
  ["Spill the pettiest thing that ever annoyed you. The group scores it out of 10.", 'none', 2, 'group'],
  ["Share your most unpopular opinion about food, music or dating. Defend it for 30 seconds.", 'none', 2, 'group'],
  ["Tell the story of the time you were most confidently wrong.", 'none', 2, 'group'],
  ["Admit something you pretend to like but do not. The group guesses what it is first.", 'none', 2, 'group'],
  ["Say the thing you have always wanted to say to the group but never did. Make it nice.", 'none', 3, 'group'],
  ["Reveal the song you secretly cry to. Play ten seconds of it.", 'none', 3, 'group'],
  ["Everyone rates their own dancing out of 10, then a friend rates them. Compare scores.", 'none', 2, 'group'],
  ["Confess the worst advice you have ever given with total confidence.", 'none', 1, 'group'],
  ["Name three things on your before-I-turn-40 list. The group adds a fourth.", 'none', 1, 'group'],
  ["Tell the group the most reckless thing you have done on a first date. Skip if you would rather not.", 'none', 3, 'group'],
  ["Describe the worst drink you have ever had, and what it taught you.", 'none', 1, 'group'],
];

// Table-hop: talk to strangers. Always ask first; nobody is filmed or photographed without agreeing.
const stranger: Row[] = [
  ["Introduce your group to another group like you are hosting a talk show. Ask names and one fun fact each, only if they are up for it.", 'none', 2, 'group'],
  ["Ask someone what the most spontaneous thing they did this year was, and match it with yours.", 'none', 2],
  ["Ask someone for their best pickup-line story: the good, the bad, the unforgettable. Only if they are up for it.", 'none', 3],
  ["Ask the next table to teach you a bar game they love: darts, cards, anything.", 'none', 2],
  ["Challenge someone to a friendly game of pool, darts or cards. The loser compliments the winner.", 'none', 3, 'any', 'activity'],
  ["Ask a stranger what the best bar they have ever been to was, and why.", 'none', 1],
  ["Ask someone what they are celebrating or commiserating tonight. Toast to it, whichever it is.", 'none', 2],
  ["Ask three strangers for a recommendation each: a song, a show, a bar. Write them on a napkin.", 'photo', 1],
  ["Ask someone to guess your number of first dates this year. Answer honestly or hilariously.", 'none', 3],
  ["Ask a stranger for the best compliment they have ever received. Give them one back.", 'none', 2],
  ["Ask someone to add one song to your playlist. Photograph their pick, only if they agree.", 'photo', 1],
  ["Ask someone: ghost story or love story? Then listen to the best one they have.", 'none', 2],
  ["Find a table celebrating something and ask for the story. Give your best congratulations.", 'none', 2],
  ["Ask someone who looks like a regular what to order. Order it.", 'photo', 1, 'any', 'bar'],
  ["Ask someone for the best breakup song of all time and add it to a playlist.", 'none', 2],
  ["Ask a stranger to describe your group's vibe in one sentence. Argue with the answer.", 'none', 2, 'group'],
  ["Ask someone for their hidden talent and ask them to prove it, only if they are game.", 'video', 3],
  ["Ask a local to name the most underrated bar in the city.", 'none', 1],
  ["Ask a stranger to give your friend a pep talk. Film it only if they agree.", 'video', 3, 'group'],
  ["Ask someone what they would order for their last meal. No judgement allowed.", 'none', 1],
  ["Invite another group to join one of your games for five minutes. Ask politely.", 'none', 3, 'group'],
  ["Ask a stranger to rate your outfit like a fashion judge. Accept the verdict graciously.", 'none', 2],
];

// Bounty hunts: find it, photograph it. Photograph the thing, not strangers, unless they say yes.
const bounty: Row[] = [
  ["Find something shaped like a heart. Photograph it.", 'photo', 1],
  ["Find the weirdest item on the menu and photograph it with a completely straight face.", 'photo', 1, 'any', 'food'],
  ["Find a sign with a typo or something unintentionally funny. Photograph it.", 'photo', 1],
  ["Find the best neon sign within a block. Group photo underneath, film-poster style.", 'photo', 1, 'group'],
  ["Find a candle, lamp or fairy lights and photograph your group in the glow. Moody lighting only.", 'photo', 1],
  ["Find a reflection that looks like a painting. Photograph it.", 'photo', 1],
  ["Find a mirror and get the whole crew in one frame.", 'photo', 1, 'group'],
  ["Find the best bar stool in the room and pose on it like you own the place.", 'photo', 2, 'any', 'bar'],
  ["Find a jukebox, record player or playlist screen and photograph the song you would pick.", 'photo', 1],
  ["Find the strangest garnish on the menu and photograph the description.", 'photo', 1, 'any', 'bar'],
  ["Find a spot with the city lights behind it. Group photo, moody thriller lighting.", 'photo', 2, 'group', 'view'],
  ["Find the oldest-looking item behind the bar and ask staff its story.", 'photo', 2, 'any', 'bar'],
  ["Find a door that looks like it leads somewhere exciting. Pose like you have the key.", 'photo', 2],
  ["Find something in a colour that matches your outfit exactly. Photograph your sleeve next to it.", 'photo', 2],
  ["Find a poster you would put on your wall. Take a selfie with it.", 'photo', 1],
  ["Bar bingo: spot five things: a leather jacket, mismatched shoes, a laptop, a birthday sash, matching outfits. Photograph the proof, not the people, unless they agree.", 'photo', 3, 'group'],
];

// Bar games: games to play with the table or the bar.
const game: Row[] = [
  ["Arm-wrestle a friend, best of three, if you are both up for it. The loser compliments the winner in front of everyone.", 'video', 2, 'group'],
  ["Thumb war with a friend. The loser tells their most embarrassing story.", 'video', 1, 'group'],
  ["Rock-paper-scissors tournament around the table. The champion picks the next song.", 'none', 1, 'group'],
  ["Coaster flip: flip a coaster off the table edge and catch it. Best of three wins a title.", 'video', 2, 'group', 'bar'],
  ["Most Likely To, spicy edition: write ten on napkins, vote, and read the winners aloud.", 'photo', 2, 'group'],
  ["Never have I ever, but only things you did in a bar.", 'none', 2, 'group'],
  ["Hum the opening of a song. The group guesses. Loser tells a secret.", 'video', 2, 'group'],
  ["Each person writes a terrible caption for the same photo. The group votes on the worst.", 'photo', 2, 'group'],
  ["Pub quiz: each person writes three questions for the table. The writer of the hardest one wins.", 'none', 2, 'group'],
  ["Predict what the next couple that walks in will order. Closest guess wins.", 'none', 1, 'group'],
  ["Napkin Pictionary, rom-com movie titles only. First correct guess wins.", 'photo', 2, 'group'],
  ["Charades: films you have all seen with someone you secretly had a crush on.", 'video', 3, 'group'],
  ["Describe a movie to the group using only emojis in a message. They guess.", 'none', 1, 'group'],
  ["Darts, pool or cards, whichever the venue has: the loser owes the winner a compliment, not a prize.", 'none', 2, 'group', 'activity'],
  ["Two-minute debate: who would win in a fight, a horse-sized duck or a hundred duck-sized horses? Pick sides.", 'video', 2, 'group'],
  ["Rank the bar's playlist from 1 to 10 and defend your score to the staff.", 'none', 2, 'any', 'bar'],
  ["Build the tallest tower you can from coasters and sugar packets in 90 seconds.", 'photo', 2, 'group'],
  ["Mime your job without sound. The group guesses. Wrong guesses must be hilarious.", 'video', 2, 'group'],
  ["Impression round: do your best impression of another person at the table. They score it.", 'video', 2, 'group'],
  ["Rank the group by who would survive a zombie apocalypse longest. Defend your picks.", 'none', 2, 'group'],
  ["Staring contest, group edition. The last to laugh wins a title.", 'video', 1, 'group'],
  ["Guess the cheapest and the priciest thing on the menu, then check. Closest guess wins.", 'none', 1, 'group', 'food'],
];

// Secret missions: an undercover job for one person while the others are none the wiser.
const mission: Row[] = [
  ["Slip the word 'banana' into a conversation naturally. Report back at the end.", 'none', 3],
  ["Get a friend to say 'actually' five times without noticing. Keep count.", 'none', 2, 'group'],
  ["Every time someone says 'honestly', raise one eyebrow. Count the eyebrows.", 'none', 1, 'group'],
  ["Give three friends a secret code word. When you say it, they must all look left.", 'none', 2, 'group'],
  ["Make each friend laugh within a minute without telling a joke.", 'none', 3, 'group'],
  ["Pretend you have never been to this city and ask the group for tips like a confused tourist.", 'video', 2, 'group'],
  ["Declare Opposite Hour: everyone says the opposite of what they mean for three minutes.", 'none', 3, 'group'],
  ["Get the group to say 'cheese' in sync without asking them. Photo when it works.", 'photo', 2, 'group'],
  ["Invent a fake group tradition ('we always...') and get everyone to act like it is real.", 'none', 3, 'group'],
  ["Pick the quietest friend to choose the next stop. Everyone else has to hype it up.", 'none', 2, 'group'],
  ["Keep a tally of every 'literally' someone says. Reveal the total dramatically.", 'none', 1, 'group'],
  ["Whisper a phrase along the line of friends. See how it ends up. Film the reveal.", 'video', 1, 'group'],
  ["Pretend to be a secret food critic. Rate everything you taste in hushed, dramatic whispers.", 'video', 2, 'any', 'food'],
  ["Be the group's official photographer for ten minutes: ten photos of friends laughing. Show them at the end.", 'photo', 1, 'group'],
  ["Start every story with 'Back in my day' for the next ten minutes.", 'none', 2],
  ["Get a friend to tell their best story using only the prompt 'and then what?'", 'none', 2, 'group'],
  ["Take over as DJ: pick the next three songs, with the staff's OK.", 'none', 2, 'any', 'bar'],
  ["Compliment every person in your group once without it being obvious it is a challenge.", 'none', 2, 'group'],
];

// Director's cut: make something good enough to share.
const director: Row[] = [
  ["Turn a perfectly normal moment, like ordering, into a 10-second horror trailer.", 'video', 2],
  ["Shoot a luxury perfume advert starring a salt shaker, a straw or a menu.", 'video', 2],
  ["Film a dramatic 'previously on tonight...' recap of your evening so far.", 'video', 2, 'group'],
  ["Make a one-take music video for the next song that plays.", 'video', 3, 'group'],
  ["Shoot a spy-movie scene at the table: pass a secret note, then vanish.", 'video', 2, 'group'],
  ["Shoot a moody portrait of someone with an artist's serious face.", 'photo', 1],
  ["Photograph your group so it looks like a still from a neon-lit thriller.", 'photo', 2, 'group'],
  ["Shoot a film noir moment: moody light, serious face, trench-coat energy.", 'photo', 2],
  ["Film a dramatic voice-over of your night: 'It was the night everything changed...'", 'video', 2],
  ["Take a photo that looks like a movie poster. Pick the title and the tagline.", 'photo', 2, 'group'],
  ["Film a dating-show confessional: each friend gets ten seconds to say what they think of the others.", 'video', 3, 'group'],
  ["Film a pour with the staff's permission, with a slow-motion voice-over.", 'video', 2, 'any', 'bar'],
  ["Recreate a famous painting as a group photo: the Last Supper, American Gothic, anything.", 'photo', 2, 'group'],
  ["Shoot a family portrait with everyone in stiff old-time poses and serious faces.", 'photo', 2, 'group'],
  ["Capture the most symmetrical photo of the venue you can.", 'photo', 1],
  ["Shoot a fashion editorial of a friend using only what the venue provides as props.", 'photo', 2, 'group'],
  ["Film a 20-second live news report from outside the next venue.", 'video', 2],
  ["Make a three-photo story: setup, twist, punchline.", 'photo', 2, 'group'],
];

// Beat the clock: a timer runs on the card. Start it when everyone is ready.
const timed: Row[] = [
  ["Pitch the group the most ridiculous business idea you can. The group votes with fake investor money.", 'video', 2, 'group', 'any', 60],
  ["Everyone gives the person on their left one honest compliment. No repeats.", 'none', 1, 'group', 'any', 30],
  ["List your top five red flags and defend each one.", 'none', 2, 'group', 'any', 60],
  ["Describe your group like a dating profile. The group votes on the best line.", 'none', 2, 'group', 'any', 60],
  ["Deliver your best pickup line. The group scores it with napkin paddles.", 'video', 2, 'group', 'any', 30],
  ["Rename this bar and pitch the new brand with a slogan.", 'video', 2, 'any', 'any', 60],
  ["Whisper the most scandalous celebrity gossip you can invent. No real people you know. The group votes on the juiciest.", 'none', 2, 'group', 'any', 30],
  ["Act out your favourite movie scene. The group guesses the film.", 'video', 2, 'group', 'any', 45],
  ["Commentate on your night so far like a sports commentator.", 'video', 2, 'any', 'any', 60],
  ["Draw the best caricature of the person across from you. Reveal at the end.", 'photo', 2, 'group', 'any', 90],
  ["Pitch a TV show starring your friends. Title, genre and tagline.", 'video', 2, 'group', 'any', 45],
  ["Convince the group to go to the most ridiculous next stop you can invent.", 'video', 2, 'group', 'any', 60],
  ["Show your best dance move. The group scores it.", 'video', 2, 'group', 'any', 20],
  ["Tell the worst pun you know. The group scores the groans.", 'none', 1, 'any', 'any', 20],
  ["Recite the alphabet backwards. Fail loudly and proudly.", 'none', 2, 'any', 'any', 30],
  ["Compliment the person next to you in a different style each time: pirate, poet, robot.", 'none', 2, 'group', 'any', 30],
  ["Tell the best story from your week in exactly three sentences.", 'none', 1, 'any', 'any', 60],
  ["Rap about the table's snacks. Rhymes optional, flow compulsory.", 'video', 3, 'any', 'any', 30],
];

// Local legend: make the neighbourhood part of the night.
const local: Row[] = [
  ["Ask staff for a local legend or ghost story about this block, then retell it dramatically.", 'video', 2],
  ["Photograph the best view of the city at night that you can find nearby.", 'photo', 1, 'any', 'view'],
  ["Find the most local thing within a block and explain why.", 'photo', 1],
  ["Ask a local to name their only-locals-know food spot.", 'none', 2],
  ["Find a hidden door, a speakeasy sign or an unmarked entrance. Photograph it from outside only.", 'photo', 2],
  ["Find a mural and give it a title. Announce it like a gallery curator.", 'photo', 1],
  ["Find a street name that sounds like a villain's name and introduce your group as the villains.", 'photo', 2, 'group'],
  ["Pose like an album cover with a street sign for your group's new band name.", 'photo', 2, 'group'],
  ["Ask staff what locals order, then give it a fair review.", 'photo', 1, 'any', 'food'],
  ["Find an activity venue's wildest-looking game and give it a five-star review.", 'photo', 1, 'any', 'activity'],
];

// Toast and bar craft: names, tastes, stories and speeches. Never about amounts or strength. 19+ only.
const toast: Row[] = [
  ["Link arms with a friend and drink together, one sip each, like a wedding toast. Film it.", 'video', 2, 'group'],
  ["Ask the bartender what they drink on their night off and why.", 'none', 2, 'any', 'bar'],
  ["Ask the bartender for the most interesting beer on tap, a style you have never tried. Rate it.", 'photo', 2, 'any', 'bar'],
  ["Order two different beers and do a blind taste test with a friend: eyes closed, guess which is which.", 'video', 3, 'group', 'bar'],
  ["Swap drinks with a friend and review each other's like sommeliers: 'notes of regret and citrus'.", 'video', 2, 'group'],
  ["Ask the bartender to make you something with a story: a house special or one they invented. Learn the story.", 'photo', 2, 'any', 'bar'],
  ["Order a drink you cannot pronounce. Say it with total confidence.", 'video', 2, 'any', 'bar'],
  ["Choose a drink for a friend based on their personality. Present it with a short speech.", 'video', 2, 'group', 'bar'],
  ["Make a toast to your worst ex with sincere thanks for the lessons. Keep it kind.", 'video', 3, 'group'],
  ["Hold eye contact during every cheers tonight. Superstition says it is required, or else seven years of bad luck.", 'none', 2, 'group'],
  ["Write a three-line toast with a beginning, a twist and a punchline. Perform it.", 'video', 2, 'group'],
  ["Ask the bartender to describe their favourite drink as if it were a person. Order it.", 'photo', 2, 'any', 'bar'],
  ["Sniff test: close your eyes while a friend holds a drink under your nose. Guess the main smell.", 'video', 3, 'group'],
  ["Raise a glass to someone who is not here. Say one honest thing about them.", 'none', 2, 'group'],
  ["Tell the group about a drink that changed your night. Keep it to a minute.", 'none', 2, 'group'],
  ["Pick a signature drink for tonight and defend it like a politician.", 'video', 2],
  ["Order the oldest-sounding name on the menu and rate whether it deserves its age.", 'photo', 1, 'any', 'bar'],
  ["Give your drink a one-star and a five-star review in the same sentence.", 'video', 2],
  ["Pick a drink with an ingredient you have never heard of, then ask the bartender what it is.", 'photo', 2, 'any', 'bar'],
  ["Pick the table's drink of the night by group vote. The winner gets a title and a round of applause.", 'none', 1, 'group'],
  ["Do a toast in a pirate voice, in rhyme.", 'video', 2, 'group'],
  ["Ask the bartender to name a drink after your group. Photograph the name.", 'photo', 2, 'any', 'bar'],
  ["Describe the drink of the person at the end of the bar in flavour notes: quietly, kindly, without pointing.", 'none', 2],
  ["Do a cross-armed toast with someone you met tonight. Ask them first.", 'video', 3],
  ["Say cheers in a different accent every time tonight. Vote on the best one.", 'video', 2, 'group'],
  ["Order a drink and take the most dramatic sip of your life, then describe the flavour like a movie villain.", 'video', 2],
  ["Ask the bartender for a recommendation for someone who trusts nothing. Rate the choice.", 'photo', 2, 'any', 'bar'],
  ["Ask the bartender for the one drink they would never put on the menu. Hear the reason.", 'none', 2, 'any', 'bar'],
  ["Mock the most overrated drink you know, then defend the most underrated.", 'video', 2, 'group'],
  ["Give a toast so sincere that it makes someone at the table look away and smile.", 'video', 2, 'group'],
  ["Ask the bartender to teach you the name of a cocktail technique, then use the word all night.", 'none', 2, 'any', 'bar'],
  ["Invent a ridiculous drink name and description. The group votes on the best.", 'none', 1, 'group', 'any', 60],
];

// Heart: small kind things that make the night better.
const heart: Row[] = [
  ["Water break: everyone has a glass of water and shares the best moment so far.", 'photo', 1, 'group'],
  ["Say one thing you love about each person at the table, one sentence each.", 'none', 1, 'group'],
  ["Send a photo from tonight to someone who is not here with the caption 'wish you were here'.", 'none', 1],
  ["Plan the next hangout right now: date, place, who is bringing what.", 'photo', 1, 'group'],
  ["Take a photo of the group laughing and send it to the group chat.", 'photo', 1, 'group'],
  ["Thank the person who made tonight happen. Be specific.", 'none', 1, 'group'],
  ["Give a sincere compliment to someone who works here.", 'none', 1],
  ["Check in: is everyone OK? Do a quick thumbs-up round.", 'none', 1, 'group'],
  ["Share the best compliment you have ever received.", 'none', 1, 'group'],
  ["Everyone shares a tiny win from this week.", 'none', 1, 'group'],
  ["Make sure everyone has a safe way home. Agree on a plan now.", 'none', 1, 'group'],
  ["Write a napkin note to a friend: 'You're great because...' Photograph it before you hand it over.", 'photo', 1, 'group'],
];

export const QUESTS: Quest[] = [
  ...make('hype', hype),
  ...make('flirt', flirt),
  ...make('confess', confess),
  ...make('stranger', stranger),
  ...make('bounty', bounty),
  ...make('game', game),
  ...make('mission', mission),
  ...make('director', director),
  ...make('timed', timed),
  ...make('local', local),
  ...make('toast', toast),
  ...make('heart', heart),
];

/** Shown instead of a quest when someone has had a lot more drinks than water. */
export const WATER_BREAK: Quest = {
  id: 'water-break',
  text: 'Quest break: everyone has a glass of water and shares the best moment of the night so far.',
  cat: 'heart',
  media: 'photo',
  level: 1,
  group: 'any',
  place: 'any',
  drink: false,
};

export const LEVEL_LABEL = { 1: 'Chill', 2: 'Spicy', 3: 'Wild' } as const;
export const LEVEL_POINTS = { 1: 10, 2: 25, 3: 50 } as const;

export const CATEGORY_LABEL: Record<QuestCategory, { label: string; emoji: string; stamp: string }> = {
  hype: { label: 'Showtime', emoji: '🎤', stamp: 'SHOWTIME' },
  flirt: { label: 'Spark', emoji: '😏', stamp: 'SPARK' },
  confess: { label: 'Confession', emoji: '🤫', stamp: 'CONFESSION' },
  stranger: { label: 'Table-hop', emoji: '🗣️', stamp: 'TABLE-HOP' },
  bounty: { label: 'Bounty', emoji: '🎯', stamp: 'BOUNTY' },
  game: { label: 'Bar game', emoji: '🎲', stamp: 'BAR GAME' },
  mission: { label: 'Secret mission', emoji: '🕵️', stamp: 'SECRET MISSION' },
  director: { label: "Director's cut", emoji: '🎬', stamp: 'ACTION' },
  timed: { label: 'Beat the clock', emoji: '⏱️', stamp: 'BEAT THE CLOCK' },
  local: { label: 'Local legend', emoji: '🧭', stamp: 'LOCAL LEGEND' },
  toast: { label: 'Bar craft', emoji: '🥂', stamp: 'BAR CRAFT' },
  heart: { label: 'Heart', emoji: '💛', stamp: 'HEART' },
};

/** A title for the night, from the chaos points earned. Never from drinks. */
export function nightTitle(points: number) {
  if (points >= 200) return 'Legend of the Night';
  if (points >= 100) return 'Chaos Agent';
  if (points >= 50) return 'Troublemaker';
  if (points > 0) return 'Rookie';
  return 'Spectator';
}
