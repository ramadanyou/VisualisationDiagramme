import dmnJs from 'https://cdn.jsdelivr.net/npm/dmn-js@15.0.0/+esm';
import xml2js from 'https://cdn.jsdelivr.net/npm/xml2js@0.6.2/+esm';
import {
    unaryTest,
    evaluate
} from 'https://cdn.jsdelivr.net/npm/feelin@3.0.0/+esm';

const fileInput = document.getElementById('fileInput');
const jsonDataInput = document.getElementById('jsonDataInput');
const submitJsonButton = document.getElementById('submitJsonButton');
let parsedDmnObject;

fileInput.addEventListener('change', handleFileUpload);
submitJsonButton.addEventListener('click', handleSubmitJson);

async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result;
            resolve(result);
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsText(file);
    });
}
/*Fonction asynchrone qui parse le contenu XML d'un fichier DMN et retourne une Promise résolue avec l'objet */
async function parseDmnXml(xmlContent) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xmlContent, (err, obj) => {//Utiliser la bibliothèque xml2js pour parser le contenu XML
            if (err) {
                console.error('err:', err);
                reject(err);
            } else { // Extraire les expressions FEEL de l'objet résultant
                const feelExpressions = extractFeelExpressions(obj);
                console.log('FEEL Expressions:', feelExpressions);
                document.getElementById('generatedInputData').textContent = JSON.stringify(feelExpressions);

                resolve(obj);
            }
        });
    });
}

function extractFeelExpressions(obj) {
    const feelExpressions = [];

    const extractExpressionsFromTable = (table) => {
        if (table.input && table.input.length > 0) {
            table.input.forEach((input) => {
                if (input.inputExpression && input.inputExpression.length > 0) {
                    input.inputExpression.forEach((expression) => {
                        if (expression.text && expression.text.length > 0) {
                            feelExpressions.push(expression.text[0]);
                        }
                    });
                }
            });
        }

        if (table.rule && table.rule.length > 0) {
            table.rule.forEach((rule) => {
                if (rule.output && rule.output.length > 0) {
                    rule.output.forEach((output) => {
                        if (output.text && output.text.length > 0) {
                            feelExpressions.push(output.text[0]);
                        }
                    });
                }
            });
        }
    };

    const processDecision = (decision) => {
        if (decision['decisionTable'] && decision['decisionTable'].length > 0) {
            decision['decisionTable'].forEach((table) => {
                extractExpressionsFromTable(table);
            });
        } else if (decision['knowledgeRequirement'] && decision['knowledgeRequirement'].length > 0) {
            decision['knowledgeRequirement'].forEach((knowledgeReq) => {
                if (knowledgeReq['requiredKnowledge'] && knowledgeReq['requiredKnowledge'].length > 0) {
                    knowledgeReq['requiredKnowledge'].forEach((requiredKnowledge) => {
                        if (requiredKnowledge['encapsulatedLogic'] && requiredKnowledge['encapsulatedLogic'].length > 0) {
                            requiredKnowledge['encapsulatedLogic'].forEach((logic) => {
                                if (logic['literalExpression'] && logic['literalExpression'].length > 0) {
                                    logic['literalExpression'].forEach((expression) => {
                                        if (expression['text'] && expression['text'].length > 0) {
                                            feelExpressions.push(expression['text'][0]);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    };
    // Vérifier si l'objet DMN contient des décisions
    if (obj['definitions'] && obj['definitions']['decision']) {
        obj['definitions']['decision'].forEach((decision) => {
            processDecision(decision);
        });
    }

    return feelExpressions;
}
//Fonction asynchrone pour gérer le téléchargement de fichier.
async function handleFileUpload(event) {
    const target = event.target;
    const files = target.files;
    if (files && files.length > 0) {
        const file = files[0];
        const fileContent = await readFileContent(file);

        try {
            refreshDmnDiagram(fileContent);
            parsedDmnObject = await parseDmnXml(fileContent);
        } catch (error) {
            console.error('Erreur lors du traitement du téléchargement de fichier:', error);
            alert('Erreur lors du traitement du téléchargement de fichier: ' + error.message);
            location.reload();
        }
    }
}

function refreshDmnDiagram(dmnXml) {
    try {

        const dmnDiagramContainer = document.getElementById('dmn-diagram-container');
        dmnDiagramContainer.innerHTML = '';
        document.getElementById('evaluationResults').textContent = '';

        renderDmnDiagram(dmnXml);
    } catch (error) {
        console.error('Error refreshing DMN diagram:', error);
        alert('Error refreshing DMN diagram: ' + error.message);
        location.reload(); 
    }
}
//Rend le diagramme DMN en utilisant le contenu XML fourni.
function renderDmnDiagram(dmnXml) {
    const dmnViewer = new dmnJs({   // Créer une instance du visualiseur DMN
        container: '#dmn-diagram-container',
    });
// Importer le contenu XML pour rendre le diagramme DMN
    dmnViewer.importXML(dmnXml, (err) => {
        if (err) {
            console.error('Erreur lors du rendu du diagramme DMN:', err);
            alert(err);
            location.reload();
        } else {
            console.log('Diagramme DMN rendu avec succès !');
        }
    });
}

async function handleSubmitJson() {
    const jsonData = jsonDataInput.value.trim();
    if (jsonData === '') {
        console.warn('Please enter JSON data in the textarea.');
        return;
    }

    try {
        // Analyser les données JSON
        const userContext = JSON.parse(jsonData);

        // Extraire les expressions FEEL du XML DMN analysé
        const feelExpressions = extractFeelExpressions(parsedDmnObject);

         // Évaluer chaque expression FEEL dans le contexte des données JSON fournies par l'utilisateur
        const evaluationResults = {};
        feelExpressions.forEach((expression) => {
            try {
                const result = evaluate(expression, userContext);
                evaluationResults[expression] = result;
            } catch (error) {
                console.error(`Error evaluating expression "${expression}":`, error.message);
                evaluationResults[expression] = `Error: ${error.message}`;
            }
        });

        console.log('Evaluation Results:', evaluationResults);

        // affich resultat de evaluation
        document.getElementById('evaluationResults').textContent = JSON.stringify(evaluationResults);
    } catch (error) {
        console.error('Errer lors de analyse ou evaluation du JSON:', error);
      alert('rerreur evaluation du JSON: ' + error.message);
        location.reload();
    }
}
