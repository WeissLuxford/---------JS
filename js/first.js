function firstFunction() {


    var userAge = prompt("Потвердите что вам исполнилось 18 лет", "");

// var userAge = prompt("Потвердиет что вам исполнилось 18 лет", "");

 if (userAge <= null) {
    console.log("Введи что нибудь");
} else if (userAge <= 18) {
    console.log("Дружок.. не губи свою жизнь");
} else if (userAge >= 50) {
    console.log("Твоя жизнь, твои решения.. Проходи");
} else if (userAge >= 59) {
    console.log("Тебе уже на пенсию пора, а не по сайтам лазить!");
} else if (userAge >= 150) {
    console.log("Поздравляю ты дожил до пенсии, уважаю");
} else if (userAge = isNaN) {
    console.log("Пиши числами");
} else {
    console.log("Проваливай"); 
}

}


function secondFunction(){


var dayTime = prompt('Часы перевод в сутки, введите ваше время', "");

if (dayTime === null){
    console.log ("Вы отменили действие" ) ; 
} else if (dayTime == ''){
    console.log("Вы ничего не ввели");
} else if (+dayTime === 0){
    console.log("Полночь");
} else if (+dayTime == 1){
    console.log("Час ночи ");
} else if (+dayTime == 2){
    console.log("Два часа ночи");
} else if (+dayTime == 3){
    console.log("Три часа ночи");
} else if (+dayTime == 4){
    console.log("Четыре часа ночи");
} else if (+dayTime == 5){
    console.log("Пять часов ночи");
} else if (+dayTime == 6){
    console.log("Шесть часов утра");
} else if (+dayTime == 7){
    console.log("Семь часов утра");
} else if (+dayTime == 8){
    console.log("Восемь часов утра");
} else if (+dayTime == 9){
    console.log("Девять часов утра");
} else if (+dayTime == 10){
    console.log("Десять часов утра");
} else if (+dayTime == 11){
    console.log("Одинадцать часов утра");
} else if (+dayTime == 12){
    console.log("Полдень");
} else if (+dayTime == 13){
    console.log("Час дня");
} else if (+dayTime == 14){
    console.log("Два часа дня ");
} else if (+dayTime == 15){
    console.log("Три часа дня");
} else if (+dayTime == 16){
    console.log("Четыре часа дня");
} else if (+dayTime == 17){
    console.log("Пять часов дня");
} else if (+dayTime == 18){
    console.log("Шесть часов вечера");
} else if (+dayTime == 19){
    console.log("Семь часов вечера");
} else if (+dayTime == 20){
    console.log("Восемь часов вечера");
} else if (+dayTime == 21){
    console.log("Девять часов вечера");
} else if (+dayTime == 22){
    console.log("Десять часов вечера");
} else if (+dayTime == 23){
    console.log("Одинадцать часов вечера");
} else if (+dayTime == 24){
    console.log("Полночь");
} else if (+dayTime >= 25){
    console.log("Такого времени суток не существует");
} else if (Number.isNaN(+dayTime)){
    console.log("Вводите только цифрами");
} else {
    console.log("пожалуйста введите, только час");
} 

}


function thirdFunction(){

    var firstNumber = +prompt("Первое число") ;
    var secondNumber = +prompt("Второе число");
    var thirdNumber = +prompt("Третье число") ;

    if (firstNumber === secondNumber && secondNumber === thirdNumber){
     console.log('Они равны');
    } else if (secondNumber < firstNumber && firstNumber < thirdNumber){
       console.log('первый ' + firstNumber);
    } else if (firstNumber < secondNumber && secondNumber < thirdNumber){
       console.log('второй ' + secondNumber);
    } else if (firstNumber < thirdNumber && thirdNumber < secondNumber){
        console.log('третий ' + thirdNumber);
    } else{
        console.log('asd');
    }
}


function myLastFunction(){

var summOfAnswer = 0;
var godName = prompt("Укажите ваше имя","...");
var godYear = prompt("Укажите ваш возраст","...");
console.log("Добро пожаловать " + godName + " ,котрому(ой) " + godYear + " лет")
var firstAnswer = prompt("Сложение 2356 + 1521 = ...","");
 if(+firstAnswer == (2356 + 1521)) {
     console.log("Верно! Ответ " + (2356 + 1521)); 
     summOfAnswer++
 } else{
     console.log("Неверно! Ваш ответ " + firstAnswer + ". Верный ответ " + (2356 + 1521));
 }
var secondAnswer = prompt(" Вычитание 2356 - 1521 = ...","");
 if(+secondAnswer == (2356 - 1521)) {
     console.log("Верно! Ответ " + (2356 - 1521));
     summOfAnswer++
 } else{
     console.log("Неверно! Ваш ответ " + secondAnswer + ". Верный ответ " + (2356 - 1521));
 }
var thirdAnswer = prompt("Умножение 23 * 15 = ...","");
 if(+thirdAnswer == (23 * 15)) {
     console.log("Верно! Ответ " + (23 * 15));
     summOfAnswer++
 } else{
     console.log("Неверно! Ваш ответ " + thirdAnswer + ". Верный ответ " + (23 * 15));
 }
var fourthAnswer = prompt(" Деление 2340 / 15 = ...","");
 if(+fourthAnswer == (2340 / 15)) {
     console.log("Верно! Ответ " + (2340 / 15));
     summOfAnswer++
 } else{
     console.log("Неверно! Ваш ответ " + fourthAnswer + ". Верный ответ " + (2340 / 15));
 }
var fifthAnswer = prompt("Вычислите остаток 23 % 15 = ...","");
 if(+fifthAnswer == (23 % 15)) {
     console.log("Верно! Ответ " + (23 % 15));
     summOfAnswer++
 } else{
     console.log("Неверно! Ваш ответ " + fifthAnswer + ". Верный ответ " + (23 % 15));
 }

 console.log("Количество правильных ответов " + summOfAnswer + " из восьми");

}
