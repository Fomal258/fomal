import type { Wrestler } from "@/lib/storage";

// 이 파일만 고치면 명단이 바뀝니다. 이름을 추가/삭제하면 카드도 같이 늘고 줄어듭니다.
// 이름을 바꾸면 유튜브 검색 링크도 그 이름으로 다시 만들어집니다.

// 저장된 로스터를 새 명단으로 교체할지 판단할 때 쓰는 버전 값입니다.
// 명단을 크게 바꿨을 때 이 값을 한 번 올리면, 예전에 저장된 로스터 대신 이 명단이 다시 적용됩니다.
export const ROSTER_VERSION = "roster-2026-11-06";

// 선수 이름으로 유튜브 "올해 영상" 검색 링크를 만듭니다.
const youtubeSearch = (name: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} wrestling 2026`)}&sp=CAI%253D`;

// 이름을 카드 id로 씁니다. (영문/숫자만 남기고 나머지는 - 로 바꿈)
const toId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// 사진은 비어 있고, 편집 모드에서 넣으면 됩니다.
const toWrestler = (name: string): Wrestler => ({
  id: toId(name),
  names: [name],
  image: "",
  links: [youtubeSearch(name)],
});

// 1) 원래 링크가 있던 선수들
const withLink = [
  "1 Called Manders", "Aaron Williams", "Adriano", "Aigle Blanc", "Alex Reynolds", "Alex Shelley", "Andrew Everett", "Axton Ray",
  "Bad Dude Tito", "Brandon Day", "Brett Semtex", "Bryan Idol",
  "Carlos Zamora", "Casey Ferreira", "Cha Cha Charlie", "Chandler Hopkins", "Channing Decker", "Charlie Sterling", "Chase Emery", "Crazzy Steve",
  "Dalton Mckenzie", "Danny Duggan", "Dave Dutra", "Davey Boy Smith Jr.",
  "Elio LeFleur", "Erik Lockhart", "Erin Ordo", "Flip Gordon", "Fred Rosser", "Gianni Valletta", "Greek God Papadon",
  "Ichiban", "Iestyn Rees", "Jack J. Bonza", "Jack Morris", "Jake Manning", "Jake Parnell", "Jay Alexander", "Joe Coffey", "Joe Lando", "Joel Redman", "John Atlas", "Jordan Cruz", "Jordan Sparkes",
  "Kevin Malik", "Koto Hiro", "Lee Morrow", "Leon Chiro", "Leonardo Darwin", "Luke Hawx",
  "Mathias", "Matt Brannigan", "Matt Burns", "Matt Hayter", "Michael Allen Richard Clark", "Michael Richard Blais", "Mike Bennett", "Mike Mondo", "Miles Deville", "Moonshine Mantell",
  "Nate Prince", "Nic Nemeth", "PCO", "Ray Jaz", "Ricky Smokes", "Ricky South", "Rohan Raja", "Royce Isaacs",
  "Sam Osborne", "Satoshi Kojima", "Shawn Murphy", "Sid Scala", "Spike Trivet", "Stallion Rogers", "Steve Boz",
  "The Rebel StarBuck", "Thom Latimer", "Tom La Ruffa", "Tommy Billington", "Tommy Tanner", "Tony Nese", "Tucker", "Vic Capri", "Wardlow", "Warhorse", "Yuki Yoshioka", "Yuma Anzai", "Zak Patterson",
];

// 2) 원래 링크가 없던 선수들 (같은 규칙으로 유튜브 검색 링크를 만들어 줍니다)
const withoutLink = [
  "Alec Tomas", "Alex Duke", "Benjamin Trust", "Bryce Saturn", "calum black", "Daddy Davis", "Damian Chambers", "Diego Valens", "Dustin Waller", "Dynamite Dylan Davis", "Elijah Eros", "Fabio Ferrari", "Heddi Karaoui", "J Fowler", "Jackal Stevens", "Jake O'Grady", "Jeremy Prophet", "Jimmy House CJ Valor", "Joey Martinez", "Jon Wolfgang", "Leon van Gasteren", "Lincoln Spectre", "Louis Basham", "Mathis Myre", "Maximilien", "Michael Knight", "Michael May", "Mick Moretti", "Nick Strong", "Nico Inverardi", "Pat Dynamite", "Robbie Taylor", "Rudy Lockhart", "Samuel Saint Daniels", "Shane Mercer", "Shreddy", "Steve Gibki", "Tommy Lockhart", "Troy Ryan", "Vin Parker", "Zeke Andino",
];

// 사이트가 처음 열릴 때 사용하는 기본 명단 (총 129명)
export const defaultWrestlers: Wrestler[] = [...withLink, ...withoutLink].map(toWrestler);
