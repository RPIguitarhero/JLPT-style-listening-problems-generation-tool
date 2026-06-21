import { JLPTQuestion } from "./types";

export const PRESETS: JLPTQuestion[] = [
  {
    title: "駅での落とし物（財布）",
    jlptLevel: "N5",
    situationJa: "駅で、女の人と駅員が話しています。",
    situationEn: "At a station, a woman and a station worker are talking.",
    questionJa: "女の人の財布はどれですか。",
    questionEn: "Which one is the woman's wallet?",
    dialogue: [
      {
        speaker: "Narrator",
        labelJa: "ナレーター",
        labelEn: "Narrator",
        textJa: "第１問。駅で、女の人と駅員が話しています。女の人の財布はどれですか。",
        textEn: "Question 1. At a station, a woman and a station worker are talking. Which one is the woman's wallet?"
      },
      {
        speaker: "Woman",
        labelJa: "女の人",
        labelEn: "Woman",
        textJa: "すみません、さっき駅で黒い財布を落としました。見つかりましたか。",
        textEn: "Excuse me, I just dropped my black wallet at the station. Was it found?"
      },
      {
        speaker: "Man",
        labelJa: "駅員",
        labelEn: "Station Worker",
        textJa: "黒い財布ですね。これですか。それとも、あの大きいのですか。",
        textEn: "A black wallet... Is it this one, or is it that big one over there?"
      },
      {
        speaker: "Woman",
        labelJa: "女の人",
        labelEn: "Woman",
        textJa: "いいえ、小さくて、猫の絵があります。",
        textEn: "No, it's small, and it has a drawing of a cat on it."
      },
      {
        speaker: "Man",
        labelJa: "駅員",
        labelEn: "Station Worker",
        textJa: "猫の絵ですね。あ、これですね。ありましたよ。",
        textEn: "A cat drawing... Ah, this is the one. We found it!"
      },
      {
        speaker: "Woman",
        labelJa: "女の人",
        labelEn: "Woman",
        textJa: "良かったです！ありがとうございました！",
        textEn: "Great! Thank you very much!"
      },
      {
        speaker: "Narrator",
        labelJa: "ナレーター",
        labelEn: "Narrator",
        textJa: "女の人の財布はどれですか。",
        textEn: "Which one is the woman's wallet?"
      }
    ],
    options: [
      "大きくて黒い財布",
      "小さくて黒い、猫の絵がある財布",
      "赤くて小さい、猫の絵がある財布",
      "大きくて猫の絵がない財布"
    ],
    optionsEn: [
      "A big black wallet",
      "A small black wallet with a cat drawing",
      "A small red wallet with a cat drawing",
      "A big wallet with no cat drawing"
    ],
    correctAnswer: 2,
    explanation: "The woman states that her wallet is 'black' (黒い) and then specifies that it is 'small, and has a drawing of a cat' (小さくて、猫の絵があります). Out of the choices, option 2 is correct because it matches the color black, size small, and includes the cat painting.",
    vocabulary: [
      { word: "財布", furigana: "さいふ", meaning: "Wallet" },
      { word: "落とす", furigana: "おとす", meaning: "To drop / lose" },
      { word: "見つかる", furigana: "みつかる", meaning: "To be found" },
      { word: "猫", furigana: "ねこ", meaning: "Cat" }
    ]
  },
  {
    title: "喫茶店での注文間違い",
    jlptLevel: "N4",
    situationJa: "喫茶店で、男の人と店員が話しています。",
    situationEn: "At a cafe, a man and a clerk are talking.",
    questionJa: "男の人はこれから何を飲みますか。",
    questionEn: "What will the man drink next?",
    dialogue: [
      {
        speaker: "Narrator",
        labelJa: "ナレーター",
        labelEn: "Narrator",
        textJa: "第２問。喫茶店で、男の人と店員が話しています。男の人はこれから何を飲みますか。",
        textEn: "Question 2. At a cafe, a man and a clerk are talking. What will the man drink next?"
      },
      {
        speaker: "Man",
        labelJa: "客（男）",
        labelEn: "Male Customer",
        textJa: "あの、すみません。さっきアイスコーヒーを頼んだんですが、ホットコーヒーが来ました。",
        textEn: "Um, excuse me. I ordered an iced coffee earlier, but a hot coffee arrived."
      },
      {
        speaker: "Woman",
        labelJa: "店員（女）",
        labelEn: "Female Clerk",
        textJa: "あ、申し訳ございません。すぐにアイスコーヒーをお持ちします。しばらくお待ちください。",
        textEn: "Oh, I am extremely sorry. I will bring an iced coffee immediately. Please wait a moment."
      },
      {
        speaker: "Man",
        labelJa: "客（男）",
        labelEn: "Male Customer",
        textJa: "あ、やっぱりいいです。外は少し寒くなってきましたから、この温かいコーヒーを飲みます。",
        textEn: "Ah, actually never mind. It's gotten a bit cold outside, so I'll just drink this hot coffee."
      },
      {
        speaker: "Woman",
        labelJa: "店員（女）",
        labelEn: "Female Clerk",
        textJa: "さようでございますか。本当に失礼いたしました。ごゆっくりどうぞ。",
        textEn: "Is that so? We apologize again for the mistake. Please enjoy."
      },
      {
        speaker: "Narrator",
        labelJa: "ナレーター",
        labelEn: "Narrator",
        textJa: "男の人はこれから何を飲みますか。",
        textEn: "What will the man drink next?"
      }
    ],
    options: [
      "冷たいアイスコーヒー",
      "温かいホットコーヒー",
      "冷たいウーロン茶",
      "何ものまない"
    ],
    optionsEn: [
      "Cold iced coffee",
      "Warm hot coffee",
      "Cold Oolong tea",
      "Nothing"
    ],
    correctAnswer: 2,
    explanation: "Even though the customer originally ordered iced coffee, he realizes that 'the outside has gotten a bit cold' (外は少し寒くなってきました) and decides 'I will drink this warm coffee' (この温かいコーヒーを飲みます) instead of making the clerk write a remake. Therefore, he drinks the hot coffee which was served.",
    vocabulary: [
      { word: "頼む", furigana: "たのむ", meaning: "To order / request" },
      { word: "申し訳ございません", furigana: "もうしわけございません", meaning: "I am extremely sorry" },
      { word: "温かい", furigana: "あたたかい", meaning: "Warm" },
      { word: "失礼いたしました", furigana: "しつれいいたしました", meaning: "I apologize (formal)" }
    ]
  },
  {
    title: "友達と映画の約束",
    jlptLevel: "N3",
    situationJa: "大学で、男の学生と女の学生が話しています。",
    situationEn: "At a university, a male student and a female student are talking.",
    questionJa: "二人は何時にどこで会いますか。",
    questionEn: "What time and where will the two meet?",
    dialogue: [
      {
        speaker: "Narrator",
        labelJa: "ナレーター",
        labelEn: "Narrator",
        textJa: "第３問。大学で、男の学生と女の学生が話しています。二人は何時にどこで会いますか。",
        textEn: "Question 3. At a university, a male student and a female student are talking. What time and where will the two meet?"
      },
      {
        speaker: "Man",
        labelJa: "男の学生",
        labelEn: "Male Student",
        textJa: "ねえ、土曜日映画に行かない？三時からの回、ちょうどいいと思うんだよね。",
        textEn: "Hey, do you want to go to a movie on Saturday? I think the 3:00 PM showing would be perfect."
      },
      {
        speaker: "Woman",
        labelJa: "女の学生",
        labelEn: "Female Student",
        textJa: "いいよ、行こう！映画館の前のロビーで、上映の三十分前に待ち合わせしようか？",
        textEn: "Sure, let's go! Should we meet in the lobby in front of the theater 30 minutes before showtime?"
      },
      {
        speaker: "Man",
        labelJa: "男の学生",
        labelEn: "Male Student",
        textJa: "うーん、映画館前の喫茶店がリニューアルして、美味しそうなメニューがたくさんあるんだ。そこで少しお茶してから行かない？",
        textEn: "Hmm, the cafe in front of the theater has been remodeled and has lots of delicious things. Want to get tea/coffee first?"
      },
      {
        speaker: "Woman",
        labelJa: "女の学生",
        labelEn: "Female Student",
        textJa: "あ、いいね！じゃあ、一時間前にその喫茶店でね。遅れないでよ！",
        textEn: "Oh, that sounds nice! Let's meet at that cafe an hour before the movie then. Don't be late!"
      },
      {
        speaker: "Narrator",
        labelJa: "ナレーター",
        labelEn: "Narrator",
        textJa: "二人は何時にどこで会いますか。",
        textEn: "What time and where will the two meet?"
      }
    ],
    options: [
      "２時にカフェで",
      "２時半に映画館前のロビーで",
      "３時に映画館の中で",
      "２時に映画館前のロビーで"
    ],
    optionsEn: [
      "At 2:00 PM at the cafe",
      "At 2:30 PM in the theater lobby",
      "At 3:00 PM inside the theater",
      "At 2:00 PM in the theater lobby"
    ],
    correctAnswer: 1,
    explanation: "The movie starts at 3:00 PM (三時からの回). The woman first suggests meeting 30 minutes prior in the movie lobby (2:30 PM). However, the man suggests getting tea at the newly remodeled cafe (喫茶店) before the movie. The woman agrees and proposes meeting 'one hour prior' (一時間前) in that cafe (２時にその喫茶店で). One hour before 3:00 PM is 2:00 PM (２時).",
    vocabulary: [
      { word: "ちょうどいい", furigana: "ちょうどいい", meaning: "Just right / perfect" },
      { word: "上映", furigana: "じょうえい", meaning: "Screening / showtime" },
      { word: "待ち合わせ", furigana: "まちあわせ", meaning: "Meeting up" },
      { word: "お茶する", furigana: "おちゃする", meaning: "To have tea/coffee (casual)" }
    ]
  }
];
