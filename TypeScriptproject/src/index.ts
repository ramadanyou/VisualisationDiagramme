import dmnJs from 'dmn-js';
import xml2js from 'xml2js';
import * as feelin from '../node_modules/feelin/dist/index.js';

const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const jsonDataInput = document.getElementById('jsonDataInput') as HTMLInputElement;
const submitJsonButton = document.getElementById('submitJsonButton') as HTMLButtonElement;
let parsedDmnObject: any;

fileInput.addEventListener('change', handleFileUpload);
submitJsonButton.addEventListener('click', handleSubmitJson);


function setElementTextContent(elementId: string, textContent: string): void {
    //Récupère une référence à l'élément HTML ayant l'ID spécifié
  const element = document.getElementById(elementId);
    //// Vérifie si l'élément a été trouvé.
  if (element) {
    //Met à jour le texte à l'intérieur de l'élément HTML .
      element.textContent = textContent;
  } else {
      console.error(`Element aevc ID '${elementId}' not trouver.`);
  }
}
/*  Fonction asynchrone permettant de lire le contenu d'un fichier et de le retourner sous forme de chaîne de caractères.*/
async function readFileContent(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        // // Fonction de rappel pour gérer la lecture réussie du fichier
        reader.onload = (event) => {
            const result = (event.target as FileReader)?.result as string;
            resolve(result);
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsText(file); //// Commencer la lecture du fichier en tant que texte
    });
}
/*Fonction asynchrone qui parse le contenu XML d'un fichier DMN et retourne une Promise résolue avec l'objet */
async function parseDmnXml(xmlContent: string): Promise<any> {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xmlContent, (err, obj) => { //Utiliser la bibliothèque xml2js pour parser le contenu XML
            if (err) {
                console.error('err:', err);
                reject(err);
            } else { // Extraire les expressions FEEL de l'objet résultant
                const feelExpressions = extractFeelExpressions(obj);
                console.log('FEEL Expressions:', feelExpressions);
                setElementTextContent('generatedInputData', JSON.stringify(feelExpressions));

                resolve(obj);
            }
        });
    });
}
//Fonction qui extrait les expressions FEEL d'un objet DMN.
function extractFeelExpressions(obj: any): string[] {
    const feelExpressions: string[] = [];
    // Fonction pour extraire les expressions d'une table de décision
    const extractExpressionsFromTable = (table: any) => {
        if (table.input && table.input.length > 0) {
            table.input.forEach((input: any) => {
                if (input.inputExpression && input.inputExpression.length > 0) {
                    input.inputExpression.forEach((expression: any) => {
                        if (expression.text && expression.text.length > 0) {
                            feelExpressions.push(expression.text[0]);
                        }
                    });
                }
            });
        }

        if (table.rule && table.rule.length > 0) {
            table.rule.forEach((rule: any) => {
                if (rule.output && rule.output.length > 0) {
                    rule.output.forEach((output: any) => {
                        if (output.text && output.text.length > 0) {
                            feelExpressions.push(output.text[0]);
                        }
                    });
                }
            });
        }
    };
    // Fonction pour traiter une décision et extraire les expressions FEEL
    const processDecision = (decision: any) => {
        if (decision['decisionTable'] && decision['decisionTable'].length > 0) {
            decision['decisionTable'].forEach((table: any) => {
                extractExpressionsFromTable(table);
            });
        } else if (decision['knowledgeRequirement'] && decision['knowledgeRequirement'].length > 0) {
            decision['knowledgeRequirement'].forEach((knowledgeReq: any) => {
                if (knowledgeReq['requiredKnowledge'] && knowledgeReq['requiredKnowledge'].length > 0) {
                    knowledgeReq['requiredKnowledge'].forEach((requiredKnowledge: any) => {
                        if (requiredKnowledge['encapsulatedLogic'] && requiredKnowledge['encapsulatedLogic'].length > 0) {
                            requiredKnowledge['encapsulatedLogic'].forEach((logic: any) => {
                                if (logic['literalExpression'] && logic['literalExpression'].length > 0) {
                                    logic['literalExpression'].forEach((expression: any) => {
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
        obj['definitions']['decision'].forEach((decision: any) => {
            processDecision(decision);
        });
    }

    return feelExpressions;
}
//Fonction asynchrone pour gérer le téléchargement de fichier.
async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
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

function refreshDmnDiagram(dmnXml: string) {
    try { // Récupérer le conteneur du diagramme DMN dans le DOM
        const dmnDiagramContainer = document.getElementById('dmn-diagram-container');
        dmnDiagramContainer.innerHTML = '';
        setElementTextContent('evaluationResults', '');

        renderDmnDiagram(dmnXml);
    } catch (error) {
        console.error('Error refreshing DMN diagram:', error);
        alert('Error refreshing DMN diagram: ' + error.message);
        location.reload();
    }
}

//Rend le diagramme DMN en utilisant le contenu XML fourni.
function renderDmnDiagram(dmnXml: string): void { // Créer une instance du visualiseur DMN
  const dmnViewer = new dmnJs({ 
      container: '#dmn-diagram-container',
  });
  // Importer le contenu XML pour rendre le diagramme DMN
  dmnViewer.importXML(dmnXml, (err: any) => {
      if (err) {
          console.error('Erreur lors du rendu du diagramme DMN:', err);
          alert(err);
          location.reload();
      } else {
          console.log('Diagramme DMN rendu avec succès !');
      }
  });
}
//Gère la soumission des données JSON
async function handleSubmitJson(): Promise<void> {
  const jsonDataInput = document.getElementById('yourInputId') as HTMLInputElement;
  const jsonData = jsonDataInput.value.trim();

  if (jsonData === '') {
      console.warn('Please enter JSON data in the textarea.');
      return;
  }

  try {
      // Analyser les données JSON
      const userContext = JSON.parse(jsonData);

     
      const parsedDmnObject: any = {};

      // Extraire les expressions FEEL du XML DMN analysé
      const feelExpressions = extractFeelExpressions(parsedDmnObject);

      // Évaluer chaque expression FEEL dans le contexte des données JSON fournies par l'utilisateur
      const evaluationResults: Record<string, any> = {};
      feelExpressions.forEach((expression) => {
          try {
              const result = feelin(expression, userContext);
              evaluationResults[expression] = result;
          } catch (error) {
              console.error(`Erreur lors de l'évaluation de l'expression"${expression}":`, error.message);
              evaluationResults[expression] = `Error: ${error.message}`;
          }
      });

      console.log('Evaluation Results:', evaluationResults);

      // affich resultat de evaluation
      const evaluationResultsElement = document.getElementById('evaluationResults');
      if (evaluationResultsElement) {
          evaluationResultsElement.textContent = JSON.stringify(evaluationResults);
      }
  } catch (error) {
      console.error('Errer lors de analyse ou evaluation du JSON :', error);
      alert('rerreur evaluation du JSON: ' + error.message);
      location.reload();
  }
}