import { ICON_CREDITS } from "./icon-credits.js";

export const LICENSES = {
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "OFL 1.1": "https://openfontlicense.org/",
  "MIT": "https://opensource.org/license/mit"
};

export const CREDITS = [
  {
    group: "Правила и тексты",
    items: [
      { title: "System Reference Document 5.1", url: "https://dnd.wizards.com/resources/systems-reference-document", author: "Wizards of the Coast LLC", license: "CC BY 4.0", note: "Заклинания, умения, оружие и доспехи в библиотеках взяты из SRD 5.1, переведены и пересказаны." }
    ]
  },
  {
    group: "Иконки",
    items: ICON_CREDITS
  },
  {
    group: "Звуки",
    items: [
      { title: "Casino Audio и RPG Audio", url: "https://kenney.nl/assets", author: "Kenney", authorUrl: "https://kenney.nl", license: "CC0", note: "Стук и тряска кубиков, монеты, снаряжение." }
    ]
  },
  {
    group: "Библиотеки",
    items: [
      { title: "Dice Box", url: "https://fantasticdice.games", author: "Frank Ali, 3D Dice", authorUrl: "https://github.com/3d-dice", license: "MIT", note: "3D-кубики, которые катятся по экрану." },
      { title: "Dice Themes", url: "https://github.com/3d-dice/dice-themes", author: "Frank Ali, 3D Dice", authorUrl: "https://github.com/3d-dice", license: "MIT", note: "Материалы кубиков: гладкие, самоцвет, камень, ржавое железо, дерево, патина, мрамор, радуга." }
    ]
  },
  {
    group: "Шрифты",
    items: [
      { title: "Alegreya SC", url: "https://fonts.google.com/specimen/Alegreya+SC", author: "Juan Pablo del Peral, Huerta Tipográfica", license: "OFL 1.1" },
      { title: "EB Garamond", url: "https://fonts.google.com/specimen/EB+Garamond", author: "Georg Duffner, Octavio Pardo", license: "OFL 1.1" }
    ]
  }
];
