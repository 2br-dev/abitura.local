const mustashe = require('mustache');
import { IData, ICardData, IEducationLevel, IEducationForm, IRequirement } from "./lib/card";
import * as $ from 'jquery';
import template from './lib/template';

let cards_data:IData;
let filterParams = {
	quickSearch: "",
	level: "Бакалавриат",
	requirements: []
}

/**
 * Инициализация
 */
document.addEventListener( 'DOMContentLoaded', function() {

	// Загрузка данных
	fetch('/data/data.json')
		.then(response => response.json())
		.then(data => {
			let filteredData = filter(data);
			cards_data = data;
			render(filteredData);
		})

	$('body').on('change', '[name="level"]', filterByLevel); // Эвент изменения уровня образования
	$('body').on('input', '[name="search"]', filterByText); //  Эвент ввода поискового запроса
	$('body').on('click', '.tags label', filterByTags); //  Эвент клика на предметы ЕГЭ (теги)
	$('body').on('click', '.education-form', switchFormType); //   Эвент переключения типа образования в карточке

	$('body').on('mouseenter', '.number', (e:JQuery.MouseEnterEvent) => { makeTooltip(e.currentTarget); });
	$('body').on('mouseleave', '.number', (e:JQuery.MouseLeaveEvent) => { destroyToolTip(e.currentTarget) });
	
});

/**
 * Уничтожение tooltip
 * @param {HTMLElement} el Элемент, к которому привязан tooltip
 */
function destroyToolTip(el:HTMLElement):void{
	if(!el.querySelector('.tooltip')) return;
	el.querySelector('.tooltip').classList.remove('open');
	setTimeout(() => {
		el.querySelector('.tooltip')?.remove();
	}, 200)
}

/**
 * Создание tooltip
 * @param {HTMLElement} el Элемент, к которому должен быть привязан tooltip
 */
function makeTooltip(el:HTMLElement):void{

	if(!el.classList.contains('number-paid') && !el.classList.contains('number-free')) return;

	// Определяем ID элемента
	let card = $(el).parents('.card')[0];
	let id = parseInt(card.dataset['id']);
	let data = cards_data.elements.filter((el:ICardData) => {
		return el.id == id
	})[0]

	// Формирование оболочки
	let tooltip = document.createElement('div');
	tooltip.className = 'tooltip';

	// Определяем уровень образования
	let levelName = document.getElementById('output').dataset['level'];
	let level = data.education_levels.filter((level:IEducationLevel) => {
		return level.name == levelName
	})[0];

	// Определяем форму
	let formName = card.querySelector('.education-form.active').textContent;
	let form = level.forms.filter((formEl:IEducationForm) => {
		return formEl.name == formName
	})[0];

	// Заполняем tooltip
	let paymentType = el.classList.contains('number-free') ? "free" : "paid";

	if(paymentType == "free"){
		let mainPair = makeKVPair("Основные места", form.vacations.free.main);
		let targetPair = makeKVPair("Целевая квота",  form.vacations.free.target);
		let partcularPair = makeKVPair("Отдельная квота", form.vacations.free.particular);
		let specialPair = makeKVPair('Специальная квота', form.vacations.free.special);

		if(!mainPair && !targetPair && !partcularPair && !specialPair){
			if(form.vacations.free.total > 0){
				mainPair = makeKVPair("Всего мест", form.vacations.free.total, true)
			}else{
				mainPair = makeKVPair("Мест нет", null, true);
			}
		}

		if(mainPair) tooltip.appendChild(mainPair);
		if(targetPair) tooltip.appendChild(targetPair);
		if(partcularPair) tooltip.appendChild(partcularPair);
		if(specialPair) tooltip.appendChild(specialPair);
	}else{
		let mainPair = makeKVPair('Основные места', form.vacations.paid.main);
		let foreignPair = makeKVPair("Для иностранцев", form.vacations.paid.foreign);

		if(!mainPair && !foreignPair){
			if(form.vacations.paid.total > 0){
				mainPair = makeKVPair("Всего мест", form.vacations.paid.total, true)
			}else{
				mainPair = makeKVPair("Мест нет", null, true);
			}
		}

		if(mainPair) tooltip.appendChild(mainPair);
		if(foreignPair) tooltip.appendChild(foreignPair);
	}

	if(tooltip.innerHTML == '') return; // если нет данных, то ничего не добавляем

	// Добавляем tooltip
	el.appendChild(tooltip);
	setTimeout(() => {
		tooltip.classList.add('open');
	}, 80)

}

/**
 * Создание  пары "ключ-значение" для tooltip'а
 * @param {string} key Ключ
 * @param {any} value Значение
 * @param {boolean} force?  Принудительно показывать значение даже если оно нулевое или false
 * @returns {HTMLElement}  div с ключом и значением
 */
function makeKVPair(key:string, value:any, force:boolean = false):HTMLElement{

	if(!force){
		if (value == null || value == undefined) return null;
	}

	// Создаём контейнер
	let contentWrapper = document.createElement('div');
	contentWrapper.className = 'kv-pair';

	//  Добавляем ключ
	let keyWrapper = document.createElement('div');
	keyWrapper.className = 'key'
	keyWrapper.textContent = key;

	// Добавляем значение
	let  valueWrapper =  document.createElement('div');
	valueWrapper.className = 'value';
	valueWrapper.textContent = value?.toString();

	// Объединяем в контейнер и возвращаем DOM элемента
	contentWrapper.appendChild(keyWrapper);
	contentWrapper.appendChild(valueWrapper);
	return contentWrapper;

}

/**
 * Переключение типа образования в карточке
  */
function switchFormType(e:JQuery.ClickEvent):void{
	let card = $(e.currentTarget).parents('.card').get(0);
	let id = parseInt(card?.dataset['id']);
	let selectedForm = e.currentTarget.textContent;

	card?.querySelectorAll('.education-form').forEach((form:HTMLElement) => {
		form.classList.remove("active");
	})

	e.currentTarget.classList.add('active');
	
	let entry = cards_data.elements.filter((el:ICardData) => {
		return el.id == id
	})[0];

	if(!entry) return;

	// Получаем уровень
	let level:IEducationLevel = entry.education_levels.filter((level:IEducationLevel) => {
		return level.name == filterParams.level;
	})[0];

	// Получаем форму обучения
	let form:IEducationForm = level.forms.filter((f:IEducationForm) => {
		return f.name == selectedForm;
	})[0];

	card.querySelector('.number-free .number-value').textContent = form.vacations.free.total.toString();
	card.querySelector('.number-paid .number-value').textContent = form.vacations.paid.total.toString();
	card.querySelector('.number-duration .number-value').textContent = form.duration.toString();
	
}

/**
 * Клик по тегу (ЕГЭ)
  */
function filterByTags(e:JQuery.ClickEvent):void{
	let el = <HTMLElement>e.currentTarget;
	let content = el.textContent;
	let already = el.classList.contains('active');

	if(!already){
		el.classList.add('active');
	}else{
		el.classList.remove('active');
	}

	let selectedTags = document.querySelectorAll('.tags label.active');
	filterParams.requirements = [];

	selectedTags.forEach((tag:HTMLElement) => {
		filterParams.requirements.push(tag.textContent);
	})

	let filteredData = filter(cards_data);
	render(filteredData);
}

/**
 * Фильтрация по тексту (быстрый поиск)
  */
function filterByText(e:JQuery.ChangeEvent):void{
	filterParams.quickSearch = e.currentTarget.value;
	const filteredData = filter(cards_data);
	render(filteredData);
}

/**
 * Фильтрация по уровню (Бакалавриат/Специалитет/Магистратура)
  */
function filterByLevel(e:JQuery.ChangeEvent):void{
	filterParams.level = e.currentTarget.value;
	let filteredData = filter(cards_data);
	document.querySelector('#output')?.setAttribute('data-level', e.currentTarget.value);
	document.querySelector('.filters')?.setAttribute('data-level', e.currentTarget.value);
	render(filteredData);
}

/**
 * Вывод данных с помощью Template-машины
 * @param {IData} data Данные для генерации
 */
function render(data:IData):void{
	
	let output = mustashe.render(template, data);

	document.querySelector('#output').innerHTML = output;
	document.querySelectorAll('.faculty-header').forEach((header:HTMLElement) => {
		if(header.nextElementSibling?.className == 'faculty-header') header.remove();
	})

	document.querySelectorAll('.card').forEach((card:HTMLElement) => {
		
		// Обновление кодов в карточке
		let id = parseInt(card.dataset['id']);
		let cardData = cards_data.elements[id];
		let selectedLevel = document.querySelector("[name=level]:checked ~ label")?.textContent;
		let level = cardData.education_levels?.filter((l:IEducationLevel) => {
			return l.name == selectedLevel
		})[0];

		let code = level.code;
		card.querySelector('.code').textContent = code;

		document.querySelectorAll('.education-level').forEach((level:HTMLElement) => {
			level.querySelectorAll('.education-form').forEach((form:HTMLElement) => {
				form.classList.remove('active');
			});
			level.querySelector('.education-form:first-of-type')?.classList.add('active');
		})
	})
}

/**
 * Применение фильтров к данным
 * @param data {IData} Данные
 * @returns {IData} Отфильтрованные данные
 */
function filter(data:IData):IData{

	// Уровень образования
	let outputArray = data.elements.filter((el:ICardData) => {
		
		return el.education_levels.filter((level:IEducationLevel) => {
			return level.name == filterParams.level
		}).length > 0;
	})

	// Быстрый поиск
	if(filterParams.quickSearch != ""){
		outputArray = outputArray.filter((el:ICardData) => {

			let needleS = el.speciality.toLowerCase();
			let needleF = el.faculty.toLowerCase();
			let needleP = el.profile.toLowerCase();
			let search = filterParams.quickSearch.toLowerCase();

			if(el.id == 71){
				debugger;
			}

			return needleS.indexOf(search) >= 0  || needleF.indexOf(search) >= 0 || needleP.indexOf(search) >= 0 ;
		})
	}

	// Требования
	if(filterParams.requirements.length){

		outputArray = outputArray.filter((el:ICardData) => {

			let requirements:IRequirement[] = el.requirements;

			if(requirements.length){
				
				let a:string[] = requirements.map(val => val.name)
				let b:string[] = filterParams.requirements;
				let contains = b.some(x => a.includes(x));
				return contains;
			}
		})
	}

	// Сортировка массива перед выдачей
	outputArray = sort(outputArray);

	let output:IData = {
		elements: outputArray
	}

	return output
}

/**
 * Сортировка объектов по параметру
 * @param {string} property Параметр, по которому надлежит сортировать
 * @returns {Array} Отсортированный массив
 */
function sort(input:Array<ICardData>):Array<ICardData>{

	let sortedArray = [...input]; // Копия оригинального массива для изменений

    sortedArray.sort((a:ICardData, b:ICardData) => {
		const nameA = a.faculty.toLowerCase();
		const nameB = b.faculty.toLowerCase();

		if(nameA < nameB) return -1;
        if (nameA > nameB) return 1;

        return 0;
	})

	// Создание заголовка факультета для первого элемента
	let firstElementFaculty = sortedArray[0].faculty;
	let newElement:ICardData = {
		faculty: firstElementFaculty
	};

	sortedArray.unshift(newElement); // Добавляем заголовок в начало списка

	for(let i=1; i<sortedArray.length-1;i++){
		let nextCardData =  sortedArray[i+1];
		let currentCardData = sortedArray[i];

		if(nextCardData.faculty != currentCardData.faculty){
					
			let newElement:ICardData = {
				faculty: nextCardData.faculty
			}
	
			sortedArray = InsertArray(sortedArray, (i+1), newElement);
		}
	}

	return sortedArray;
}

/**
 * Вставка в указанный индекс массива нового элемента
 * @param {Array<ICardData>} arr Входной массив
 * @param {number} index Индекс, куда поместить новый элемент
 * @param {ICardData} newElement Новый элемент
 * @returns {Array<ICardData>} Массив со вставленным элементом
 */
function InsertArray(arr:Array<ICardData>, index:number, newElement:ICardData):ICardData[]{
	let newArray =  [
		...arr.slice(0,index),
		newElement,
		...arr.slice(index)
	]
	return newArray;
}