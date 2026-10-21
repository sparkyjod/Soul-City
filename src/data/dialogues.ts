import { CharacterId } from '../types/game';

export interface DialogueChoice {
  text: string;
  response: string;
  affinityChange?: number; // e.g. +3
}

export interface DialogueNode {
  speakerId: CharacterId;
  speakerName: string;
  text: string;
  mood?: string;
  choices?: DialogueChoice[];
}

export const HINGLISH_CASUAL_BANTER: Record<string, string[]> = {
  classroom: [
    'Bro class start ho gayi kya?',
    'Teacher blackboard pe kya likh rahi hai yaar, kuch samajh nahi aa raha.',
    'Arre proxy laga dena meri agar attendance hui toh!',
    'Kal ka homework kiya? Maine toh book bhi nahi kholi thi.',
    'Shhh! Teacher hamari taraf dekh rahi hai, chup chap baith!',
    'Bas 10 minute bache hain period khatam hone mein... canteen bhaagna hai.',
  ],
  corridor: [
    'Arre ruk, aa raha hoon!',
    'Kidhar jaa rahe ho sab? Canteen ya library?',
    'Dekh kaun aa raha hai! Act normal bro.',
    'Bhai next lecture kiska hai? Bunk karein kya?',
    'Locker ki chaabi bhool gaya yaar main!',
  ],
  canteen: [
    'Chal canteen chalte hain, garma-garam samosa mil raha hai!',
    'Ek cutting chai aur do samosa, life set hai bro.',
    'Bhai treat kaun de raha hai aaj? Jatin teri baari hai!',
    'Maggi mein extra cheese dalwaya hai maine, don’t touch!',
    'Ye canteen wale bhaiya extra sauce nahi dete yaar.',
  ],
  cafe: [
    'Ye cafe ka aesthetic bohot pyara hai na?',
    'Ek cold coffee with ice cream aur brownie order karein?',
    'Chirag ek mast aesthetic photo click kar de mera!',
    'Yahan baithke baatein karne ka maza hi alag hai.',
    'Next weekend ka kya plan hai sabka?',
  ],
  arcade: [
    'Bhai race laga le! Agar main jeeta toh treat teri!',
    'Zannat ka dance stage score koi beat nahi kar sakta bro!',
    'Tekken mein aaja, do minute mein harata hoon!',
    'Ek coin aur dal, iss baar record todenge!',
  ],
  sports: [
    'Bhai goalpost pe tu khada ho ja! Main penalty leta hoon.',
    'Pass kar Ani! Pass kar!',
    'Aaj weather ekdum football khelne wala ho raha hai.',
    'Water bottle kidhar hai yaar, bohot thak gaye!',
  ],
  beach: [
    'Sunset kitna peaceful lag raha hai na?',
    'Hawa kitni mast chal rahi hai yahan beach pe.',
    'Bhai shoes nikal ke paani mein pair daalte hain!',
    'Chalo boardwalk pe ice cream khate hain.',
  ],
  general: [
    'Kya scene hai bhai? Sab badhiya?',
    'Arre sun na, ek zabardast baat batata hoon!',
    'Chal koi na, sab sort ho jayega.',
    'Aaj ka din sach mein bohot chill tha.',
  ],
};

export function getContextualDialogue(
  speakerId: CharacterId,
  listenerId: CharacterId,
  locationId: string,
  hour: number
): DialogueNode {
  // Chirag & Shreya romantic interactions
  if (
    (speakerId === 'chirag' && listenerId === 'shreya') ||
    (speakerId === 'shreya' && listenerId === 'chirag')
  ) {
    if (speakerId === 'chirag') {
      return {
        speakerId: 'chirag',
        speakerName: 'Chirag',
        text: 'Hey Shreya! Tumhare saath walk karna is my favorite part of the day. Coffee chalein kya?',
        mood: 'romantic',
        choices: [
          { text: 'Haan bilkul! Central Cafe mein hazelnut latte peete hain.', response: 'Chalo perfect! Maine tumhare favorite table ka socha hai.', affinityChange: 4 },
          { text: 'Pehle sunset dekh lete hain beach pe!', response: 'Tumhari har wish sar aankhon par, sunset it is!', affinityChange: 5 },
          { text: 'Class khatam hone ke baad pakka!', response: 'Main bell bajne ka wait karunga!', affinityChange: 2 },
        ],
      };
    } else {
      return {
        speakerId: 'shreya',
        speakerName: 'Shreya',
        text: 'Hii Chirag! Dekho sunset kitna gorgeous hai. Ek cute photo click karoge na mere saath?',
        mood: 'romantic',
        choices: [
          { text: 'Camera ready hai! Tum waise bhi har photo mein best lagti ho.', response: 'Aww thank you Chiru! Tum humesha sweetest ho.', affinityChange: 5 },
          { text: 'Chalo boardwalk pe walk karte hain!', response: 'Haan! Hawa bohot achhi chal rahi hai.', affinityChange: 4 },
        ],
      };
    }
  }

  // Anirudh & Vaishnavi romantic interactions
  if (
    (speakerId === 'anirudh' && listenerId === 'vaishnavi') ||
    (speakerId === 'vaishnavi' && listenerId === 'anirudh')
  ) {
    if (speakerId === 'anirudh') {
      return {
        speakerId: 'anirudh',
        speakerName: 'Anirudh',
        text: 'Hey Vaishu! Class ke baad Central Cafe chalein ya beach pe sunset walk karein?',
        mood: 'romantic',
        choices: [
          { text: 'Central Cafe chalte hain, cold coffee peete hain!', response: 'Done! Tumhara favorite corner table book samajho.', affinityChange: 5 },
          { text: 'Beach boardwalk pe walk karte hain shaam ko!', response: 'Perfect! Hawa bohot achhi chalegi tab tak.', affinityChange: 5 },
          { text: 'Canteen mein samosa khate hain pehle!', response: 'Haha Ani and samosa, made for each other! Chalo.', affinityChange: 4 },
        ],
      };
    } else {
      return {
        speakerId: 'vaishnavi',
        speakerName: 'Vaishnavi',
        text: 'Hii Ani! Maine notes organize kar liye hain. Break mein canteen mein milte hain na?',
        mood: 'romantic',
        choices: [
          { text: 'You are the best Vaishu! Samosa meri taraf se!', response: 'Aww Ani thank you! See you at the table.', affinityChange: 5 },
          { text: 'Library mein saath padhte hain thodi der!', response: 'Haan! Main tumhare liye seat reserve karti hoon.', affinityChange: 4 },
        ],
      };
    }
  }

  // Anirudh interactions
  if (speakerId === 'anirudh') {
    if (listenerId === 'chirag' || listenerId === 'jatin') {
      return {
        speakerId: 'anirudh',
        speakerName: 'Anirudh',
        text: 'Bhai kya bolta hai! Match mein chalein ya canteen mein samosa raid maarein?',
        mood: 'hyped',
        choices: [
          { text: 'Pehle samosa, fir football pitch pe match!', response: 'Ekdum solid plan bhai, yahi sunna chahta tha!', affinityChange: 3 },
          { text: 'Arcade mein racing chalte hain aaj!', response: 'Done! Dekhte hain aaj kaun lap record banata hai.', affinityChange: 3 },
          { text: 'Bhai thoda padh bhi lein kal exam hai!', response: 'Arre tension mat le, Jatin ke notes zindabad!', affinityChange: 2 },
        ],
      };
    }
    return {
      speakerId: 'anirudh',
      speakerName: 'Anirudh',
      text: 'Yo! Aaj ka mausam ekdum mast hai. Kya chal raha hai tumhara?',
      mood: 'chill',
      choices: [
        { text: 'Sab mast! Squad ko leke cafe chalein?', response: 'Chalo, Ani is always ready for good food and coffee!', affinityChange: 3 },
        { text: 'Bas campus ghoom rahe the.', response: 'Badiya hai, thoda walk karna zaroori hai.', affinityChange: 2 },
      ],
    };
  }

  // Zannat interactions
  if (speakerId === 'zannat') {
    return {
      speakerId: 'zannat',
      speakerName: 'Zannat',
      text: 'OMG suno na! Mall mein new collection aayi hai aur Arcade mein mera high score koi break nahi kar paaya!',
      mood: 'hyped',
      choices: [
        { text: 'Tu arcade ki undisputed queen hai Zan!', response: 'Haha obvious si baat hai! Nobody beats my rhythm combos.', affinityChange: 4 },
        { text: 'Chalo mall shopping aur cold drinks peete hain!', response: 'Yasss! Lets go, I need cute new sunglasses.', affinityChange: 4 },
        { text: 'Pehle assignment submit kar lein!', response: 'Yaar tum bhi na... padhai baad mein pehle fun!', affinityChange: 1 },
      ],
    };
  }

  // Shagun interactions
  if (speakerId === 'shagun') {
    return {
      speakerId: 'shagun',
      speakerName: 'Shagun',
      text: 'Bhai bhookh se jaan nikal rahi hai meri! Canteen ke samosa aur chai ka kya scene hai?',
      mood: 'hungry',
      choices: [
        { text: 'Chal meri taraf se treat!', response: 'Sach mein?! You are the best friend in the universe bro!', affinityChange: 5 },
        { text: 'Pav bhaji try karein kya market mein?', response: 'Oh ho ho! Ekdum butter waali pav bhaji, chalo!', affinityChange: 4 },
        { text: 'Diet pe control kar Shagun!', response: 'Diet shuru hogi agle Monday se, abhi mat bolo haha!', affinityChange: 2 },
      ],
    };
  }

  // Jatin interactions
  if (speakerId === 'jatin') {
    return {
      speakerId: 'jatin',
      speakerName: 'Jatin',
      text: 'Gym session done, coding practical done. Ab ground pe football ya arcade mein gaming?',
      mood: 'hyped',
      choices: [
        { text: 'Football field pe 1v1 shootout karte hain!', response: 'Aa ja ground pe, gloves pehen ke aata hoon!', affinityChange: 4 },
        { text: 'Laptop band kar aur cafe mein chill kar.', response: 'Sahi bol raha hai, thoda brain refresh chahiye.', affinityChange: 3 },
      ],
    };
  }

  // Default fallback
  const pool = HINGLISH_CASUAL_BANTER[locationId] || HINGLISH_CASUAL_BANTER.general;
  const line = pool[Math.floor(Math.random() * pool.length)];
  return {
    speakerId,
    speakerName: speakerId.toUpperCase(),
    text: line,
    mood: 'chill',
    choices: [
      { text: 'Sahi baat hai bhai!', response: 'Bilkul! Chalo aage badhte hain.', affinityChange: 2 },
      { text: 'Chal saath chalte hain.', response: 'Haan, let’s go!', affinityChange: 3 },
    ],
  };
}
