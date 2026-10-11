// Every word on the invitation.

export const QUOTE = {
  text: 'If I really like you I’ll invite you to suffer with me. Runs, workouts, type 2 fun.',
  by: '@jaixbhatia',
  url: 'https://x.com/jaixbhatia',
}

export const COVER = {
  id: 'cover',
  clock: 284,
  kicker: 'The pleasure of your suffering is requested',
  script: 'You are cordially invited to',
  title: 'Suffer',
  with: 'with me',
  line: 'Runs · Workouts · Type 2 Fun*',
  because: 'Because I really like you.',
  details: [
    ['When', '4:45 a.m. Sharp.'],
    ['Where', 'Outside. All of it.'],
    ['Dress', 'Moisture-wicking.'],
    ['Bring', 'Knees. Both, ideally.'],
  ],
  foot: '*Fun to have had. Not fun to have.',
  regrets: 'Regrets only. You will have several.',
  cue: 'Scroll to accept',
}

// level: how far up the one gauge this is, out of twelve
export const PROGRAMME = [
  {
    id: 'alarm',
    clock: 285,
    no: 'I',
    time: '4:45 a.m.',
    title: 'The Alarm',
    body: 'It is dark. It is cold. Your bed has never loved you more. Somebody who likes you is standing over it with a clock.',
    you: 'It’s still night.',
    me: 'It’s basically morning.',
    level: 2,
    amount: 'A normal amount. (It is one gauge.)',
  },
  {
    id: 'run',
    clock: 315,
    no: 'II',
    time: '5:15 a.m.',
    title: 'The “Easy” Run',
    body: 'Ten kilometres at conversational pace. The pace is mine. The conversation is you asking how much further, and me pointing at a sign.',
    you: 'How much further?',
    me: 'Almost there.',
    aside: 'Repeat for fifty minutes.',
    level: 4,
    amount: 'Quite a lot, actually.',
  },
  {
    id: 'hill',
    clock: 380,
    no: 'III',
    time: '6:20 a.m.',
    title: 'The Hill',
    body: 'Hill repeats. You go up it. You come down it, one way or another. “One more” is not a number. It is a way of life.',
    you: 'You said last one.',
    me: 'Last one. After this one.',
    level: 6,
    amount: 'An alarming amount.',
  },
  {
    id: 'gym',
    clock: 425,
    no: 'IV',
    time: '7:05 a.m.',
    title: 'The Workout',
    body: 'Burpees: a push-up you fall into, then a jump nobody asked for. As many rounds as possible. It is always possible.',
    you: 'I can’t feel my arms.',
    me: 'That’s the arms working.',
    level: 8,
    amount: 'More than is medically advisable.',
  },
  {
    id: 'plunge',
    clock: 470,
    no: 'V',
    time: '7:50 a.m.',
    title: 'The Cold Plunge',
    body: 'Three minutes at three degrees. Marvellous for recovery, they say, and for finding out what noise you make. You stop feeling it after a while. That is the worrying part.',
    you: '(A noise.)',
    me: 'Breathe. See? Fun.',
    level: 10,
    amount: 'Enough to share my ice.',
  },
  {
    id: 'brunch',
    clock: 510,
    no: 'VI',
    time: '8:30 a.m.',
    title: 'Brunch',
    body: 'Type 1 fun. Pancakes, coffee, a chair. This is the only part you will remember, which is exactly how I get you to come back.',
    you: 'That was actually kind of fun.',
    me: 'Same time tomorrow.',
    level: 12,
    amount: 'The full amount.',
  },
]

export const GAUGE = { left: 'How much I like you', right: 'How much this hurts', steps: 12 }

export const RSVP = {
  id: 'rsvp',
  clock: 540,
  kicker: 'R.S.V.P.',
  script: 'Same time tomorrow?',
  by: 'Kindly reply by 4:44 a.m.',
  pleasure: 'Accepts with pleasure',
  dread: 'Accepts with dread',
  // what the third button says each time it gets away
  decline: ['Declines', 'Nice try', 'Still no', 'Admirable', 'Fine. Accepts.'],
  after: {
    pleasure: ['Wonderful.', 'I knew you would. See you at 4:45. Bring someone you really like.'],
    dread: ['Noted.', 'Dread is also a yes. See you at 4:45. Bring someone you really like.'],
    gaveUp: ['There it is.', 'Nobody has ever declined. See you at 4:45. Bring someone you really like.'],
  },
  share: {
    title: 'Invite someone to suffer',
    to: 'Their name',
    from: 'Your name',
    copy: 'Copy their invitation',
    send: 'Send it',
    copied: 'Copied. They will thank you by Thursday.',
    text: 'If I really like you I’ll invite you to suffer with me.',
  },
}

export const SMALL_PRINT = {
  title: 'The small print',
  scale: [
    ['Type 1 fun', 'Fun while it is happening.', 'Brunch.'],
    ['Type 2 fun', 'Miserable while it is happening. Fun by Thursday.', 'Everything else on this invitation.'],
    ['Type 3 fun', 'Not fun. Not then, not ever. We do not speak of it.', 'The canyon.'],
  ],
  latin: 'Forsan et haec olim meminisse iuvabit.',
  english: 'Perhaps one day it will be a joy to remember even this.',
  source: 'Virgil, on type 2 fun. Aeneid, I. 203',
  credits: 'Fan-made and unofficial. No knees were consulted. Starring a fluffy thing that looks suspiciously like the one between “Add to story” and “Copy link”.',
}

export const SECTIONS = [COVER, ...PROGRAMME, RSVP]
