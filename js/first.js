function firstFunction() {


    var +userAge = prompt("Потвердите что вам исполнилось 18 лет", "");

// var userAge = prompt("Потвердиет что вам исполнилось 18 лет", "");

 if (userAge <= null) {
    alert("Введи что нибудь");
} else if (userAge <= 18) {
    alert("Дружок.. не губи свою жизнь");
} else if (userAge <= 50) {
    alert("Твоя жизнь, твои решения.. Проходи");
} else if (userAge >= 50) {
    alert("Твоя жизнь, твои решения.. Проходи");
} else if (userAge >= 59) {
    alert("Тебе уже на пенсию пора, а не по сайтам лазить!");
} else if (userAge >= 150) {
    alert("Поздравляю ты дожил до пенсии, уважаю");
} else if (userAge = isNaN) {
    alert("Пиши числами");
} else {
    alert("Проваливай"); 
}

}


function secondFunction(){


var dayTime = prompt('Часы перевод в сутки, введите ваше время', "");

if (dayTime === null){
    alert ("Вы отменили действие" ) ; 
} else if (dayTime == ''){
    alert("Вы ничего не ввели");
} else if (+dayTime === 0){
    alert("Полночь");
} else if (+dayTime == 1){
    alert("Час ночи ");
} else if (+dayTime == 2){
    alert("Два часа ночи");
} else if (+dayTime == 3){
    alert("Три часа ночи");
} else if (+dayTime == 4){
    alert("Четыре часа ночи");
} else if (+dayTime == 5){
    alert("Пять часов ночи");
} else if (+dayTime == 6){
    alert("Шесть часов утра");
} else if (+dayTime == 7){
    alert("Семь часов утра");
} else if (+dayTime == 8){
    alert("Восемь часов утра");
} else if (+dayTime == 9){
    alert("Девять часов утра");
} else if (+dayTime == 10){
    alert("Десять часов утра");
} else if (+dayTime == 11){
    alert("Одинадцать часов утра");
} else if (+dayTime == 12){
    alert("Полдень");
} else if (+dayTime == 13){
    alert("Час дня");
} else if (+dayTime == 14){
    alert("Два часа дня ");
} else if (+dayTime == 15){
    alert("Три часа дня");
} else if (+dayTime == 16){
    alert("Четыре часа дня");
} else if (+dayTime == 17){
    alert("Пять часов дня");
} else if (+dayTime == 18){
    alert("Шесть часов вечера");
} else if (+dayTime == 19){
    alert("Семь часов вечера");
} else if (+dayTime == 20){
    alert("Восемь часов вечера");
} else if (+dayTime == 21){
    alert("Девять часов вечера");
} else if (+dayTime == 22){
    alert("Десять часов вечера");
} else if (+dayTime == 23){
    alert("Одинадцать часов вечера");
} else if (+dayTime == 24){
    alert("Полночь");
} else if (+dayTime >= 25){
    alert("Такого времени суток не существует");
} else if (Number.isNaN(+dayTime)){
    alert("Вводите только цифрами");
} else {
    alert("пожалуйста введите, только час");
} 

}


function thirdFunction(){

    var firstNumber = +prompt("Первое число") ;
    var secondNumber = +prompt("Второе число");
    var thirdNumber = +prompt("Третье число") ;

    if (firstNumber === secondNumber && secondNumber === thirdNumber){
     alert('Они равны');
    } else if ((secondNumber < firstNumber && firstNumber < thirdNumber ) || (secondNumber > firstNumber && firstNumber > thirdNumber)){
       alert('Среднее число ' + firstNumber);
    } else if ((firstNumber < secondNumber && secondNumber < thirdNumber ) || (firstNumber > secondNumber && secondNumber > thirdNumber)){
       alert('Среднее число ' + secondNumber);
    } else if ((firstNumber < thirdNumber && thirdNumber < secondNumber) || (firstNumber > thirdNumber && thirdNumber > secondNumber )){
        alert('Среднее число ' + thirdNumber);
    } else{
        alert('......');
    }
}


function myLastFunction(){

var summOfAnswer = 0;
var godName = prompt("Укажите ваше имя","...");
var godYear = prompt("Укажите ваш возраст","...");
alert("Добро пожаловать " + godName + " ,котрому(ой) " + godYear + " лет")
var firstAnswer = prompt("Сложение 2356 + 1521 = ...","");
 if(+firstAnswer == (2356 + 1521)) {
     alert("Верно! Ответ " + (2356 + 1521)); 
     summOfAnswer++
 } else{
     alert("Неверно! Ваш ответ " + firstAnswer + ". Верный ответ " + (2356 + 1521));
 }
var secondAnswer = prompt(" Вычитание 2356 - 1521 = ...","");
 if(+secondAnswer == (2356 - 1521)) {
     alert("Верно! Ответ " + (2356 - 1521));
     summOfAnswer++
 } else{
     alert("Неверно! Ваш ответ " + secondAnswer + ". Верный ответ " + (2356 - 1521));
 }
var thirdAnswer = prompt("Умножение 23 * 15 = ...","");
 if(+thirdAnswer == (23 * 15)) {
     alert("Верно! Ответ " + (23 * 15));
     summOfAnswer++
 } else{
     alert("Неверно! Ваш ответ " + thirdAnswer + ". Верный ответ " + (23 * 15));
 }
var fourthAnswer = prompt(" Деление 2340 / 15 = ...","");
 if(+fourthAnswer == (2340 / 15)) {
     alert("Верно! Ответ " + (2340 / 15));
     summOfAnswer++
 } else{
     alert("Неверно! Ваш ответ " + fourthAnswer + ". Верный ответ " + (2340 / 15));
 }
var fifthAnswer = prompt("Вычислите остаток 23 % 15 = ...","");
 if(+fifthAnswer == (23 % 15)) {
     alert("Верно! Ответ " + (23 % 15));
     summOfAnswer++
 } else{
     alert("Неверно! Ваш ответ " + fifthAnswer + ". Верный ответ " + (23 % 15));
 }

 alert("Количество правильных ответов " + summOfAnswer + " из восьми");

}
