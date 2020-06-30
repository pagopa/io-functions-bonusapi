import { format } from "date-fns";
import { MessageContent } from "io-functions-commons/dist/generated/definitions/MessageContent";
import { UTCISODateFromString } from "italia-ts-commons/lib/dates";

export const getRedeemedBonusMessageContent = (
  redeemedAt: UTCISODateFromString
) => {
  const formattedDate = format(redeemedAt, "dd/MM/yyyy");
  return MessageContent.decode({
    markdown: `
**Il Bonus Vacanze concesso alla tua famiglia è stato speso il ${formattedDate}**.

Da questo momento in poi, lo troverai sempre nella sezione Pagamenti, con la dicitura ""Utilizzato"".

Ti ricordiamo che l'utente a cui è intestata la fattura del pagamento alla struttura ricettiva scelta ha diritto a detrarre, nella prossima dichiarazione dei redditi, l'importo specificato nel dettaglio del Bonus Vacanze.
Attenzione: se il prezzo pagato per la vacanza è inferiore all'importo massimo del bonus riconosciuto, la detrazione va ricalcolata: sarà pari al 20% della somma pagata alla struttura ricettiva
`,
    subject: "Il tuo Bonus Vacanze è stato utilizzato con successo!"
  }).getOrElseL(() => {
    throw new Error("Error creating notification message");
  });
};
