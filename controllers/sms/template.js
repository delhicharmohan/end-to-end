const templateList = [
    {
        "bank": "RBL",
        "searchers": [
            {
                "key": "rbl_upi",
                "search": [
                    {
                        "key": "amount",
                        "search": "credited for Rs.",
                        "required": true,
                    },
                    {
                        "key": "accountNo",
                        "search": "Your a/c",
                        "required": true,
                    },
                    {
                        "key": "upi",
                        "search": "UPI Ref no",
                        "required": true,
                    },
                    {
                        "key": "bankname",
                        "search": "RBL Bank",
                        "required": false,
                    }
                ]
            },
            {
                "key": "rbl_imps",
                "search": [
                    {
                        "key": "amount",
                        "search": "Rs",
                        "required": true,
                    },
                    {
                        "key": "credited",
                        "search": "credited",
                        "required": true,
                    },
                    {
                        "key": "accountNo",
                        "search": "Bank a/c",
                        "required": true,
                    },
                    {
                        "key": "imps",
                        "search": "Info:IMPS",
                        "required": true,
                    },
                    {
                        "key": "bankname",
                        "search": "RBL Bank",
                        "required": true,
                    }
                ]
            },
            {
                "key": "rbl_upi_corprate",
                "search": [
                    {
                        "key": "amount",
                        "search": "Rs",
                        "required": true,
                    },
                    {
                        "key": "credited",
                        "search": "credited to RBL Bank",
                        "required": true,
                    },
                    {
                        "key": "accountNo",
                        "search": "RBL Bank a/c",
                        "required": true,
                    },
                    {
                        "key": "upi",
                        "search": "(Ref -UPI",
                        "required": true,
                    },
                    {
                        "key": "bankname",
                        "search": "RBL Bank",
                        "required": false,
                    }
                ]
            }
        ],

        "filters": [
            {
                "key": "rbl_upi",
                "filter": [
                    {
                        "key": "accountNo",
                        "regex": "a\\/c\\s+no\\.\\s+(\\w+)",
                    },
                    {
                        "key": "amount",
                        "regex": "Rs\\.(\\d+\\.\\d+)"
                    },

                    {
                        "key": "refId",
                        "regex": "\\(UPI Ref no (\\d+)\\)"
                    },
                ]
            },
            {
                "key": "rbl_imps",
                "filter": [
                    {
                        "key": "accountNo",
                        "regex": "a\\/c (\\w+)"
                    },
                    {
                        "key": "amount",
                        "regex": "Rs (\\d+(\\.\\d+)?) credited"
                    },

                    {
                        "key": "refId",
                        "regex": "IMPS (\\d+)"
                    },
                ]
            },

            {
                "key": "rbl_upi_corprate",
                "filter": [
                    {
                        "key": "accountNo",
                        "regex": "a\\/c\\s([A-Za-z0-9]+)",
                    },
                    {
                        "key": "amount",
                        "regex": "Rs\\s(\\d+(\\.\\d+)?)"
                    },

                    {
                        "key": "refId",
                        "regex": "Ref -UPI\\/(\\d+)"
                    },
                ]
            },
        ],
    },

    {
        "bank": "SBI",
        "searchers": [
            {
                "key": "sbi_imps",
                "search": [

                    {
                        "key": "prefix",
                        "search": "Dear SBI User,",
                        "required": true,
                    },

                    {
                        "key": "amount",
                        "search": "credited by Rs.",
                        "required": true,
                    },
                    {
                        "key": "accountNo",
                        "search": "your A/c",
                        "required": true,
                    },
                    {
                        "key": "imps",
                        "search": "Imps",
                        "required": true,
                    },
                    {
                        "key": "ref_no",
                        "search": "Ref No",
                        "required": true,
                    },
                    {
                        "key": "bankname",
                        "search": "SBI",
                        "required": true,
                    }
                ]
            },
            {
                "key": "sbi_c_transfer",
                "search": [

                    {
                        "key": "prefix",
                        "search": "Dear SBI User, your A/c",
                        "required": true,
                    },

                    {
                        "key": "amount",
                        "search": "-credited by Rs.",
                        "required": true,
                    },
                    {
                        "key": "accountNo",
                        "search": "your A/c",
                        "required": true,
                    },
                    {
                        "key": "trasfer_by",
                        "search": "transfer from ",
                        "required": true,
                    },
                    {
                        "key": "ref_no",
                        "search": "Ref No",
                        "required": true,
                    },
                    {
                        "key": "bankname",
                        "search": "-SBI",
                        "required": true,
                    }
                ]
            },
        ],
        "filters": [
            {
                "key": "sbi_imps",
                "filter": [
                    {
                        "key": "accountNo",
                        "regex": "A\\/c (\\w+)",
                    },
                    {
                        "key": "amount",
                        "regex": "Rs\\.(\\d+(\\.\\d+)?)"
                    },

                    {
                        "key": "refId",
                        "regex": "Ref No (\\d+)"
                    },
                ]
            },

            {
                "key": "sbi_c_transfer",
                "filter": [
                    {
                        "key": "accountNo",
                        "regex": "A\\/c\\s([A-Za-z0-9]+)"
                    },
                    {
                        "key": "amount",
                        "regex": "Rs\\.(\\d+(\\.\\d+)?)"
                    },

                    {
                        "key": "refId",
                        "regex": "Ref No (\\d+)"
                    },
                ]
            }
        ],
    },

    {
        "bank": "MAH",
        "searchers": [
            {
                "key": "bom_upi_corprate",
                "search": [

                    {
                        "key": "prefix",
                        "search": "Your A/c No",
                        "required": true,
                    },

                    {
                        "key": "amount",
                        "search": "credited by INR",
                        "required": true,
                    },
                    {
                        "key": "upi_prefix",
                        "search": "with UPI RRN",
                        "required": true,
                    },
                    {
                        "key": "ac_balance",
                        "search": "A/c Bal is",
                        "required": true,
                    },
                    {
                        "key": "bankname",
                        "search": "CR-MAHABANK",
                        "required": true,
                    }
                ]
            }
        ],
        "filters": [
            {
                "key": "bom_upi_corprate",
                "filter": [
                    {
                        "key": "accountNo",
                        "regex": "A\\/c\\s+No\\s+xx\\s+(\\d{4})"
                    },
                    {
                        "key": "amount",
                        "regex": "INR\\s+(\\d{1,3}(,\\d{3})*(\\.\\d{2})?)"
                    },
                    {
                        "key": "refId",
                        "regex": "UPI\\s+RRN\\s+(\\d{12})"
                    },
                ]
            }
        ],
    },

    {
        "bank": "EQU",
        "searchers": [
            {
                "key": "equ_upi",
                "search": [

                    {
                        "key": "prefix",
                        "search": "Dear customer,",
                        "required": true,
                    },

                    {
                        "key": "amount",
                        "search": "you have received Rs.",
                        "required": true,
                    },
                    {
                        "key": "upi_prefix",
                        "search": "UPI ref num",
                        "required": true,
                    },
                    {
                        "key": "bankname",
                        "search": "Team Equitas.",
                        "required": true,
                    }
                ]
            }
        ],
        "filters": [
            {
                "key": "equ_upi",
                "filter": [
                    {
                        "key": "accountNo",
                        "regex": "UPI\\s+ref\\s+num\\s+(\\d{9})"
                    },
                    {
                        "key": "amount",
                        "regex": "Rs\\.\\s+([\\d,.]+)"
                    },
                    {
                        "key": "refId",
                        "regex": "UPI\\s+ref\\s+num\\s+(\\d{9})"
                    },
                ]
            }
        ],
    },

    {
        "bank": "Axi",
        "searchers": [
            {
                "key": "axis_upi",
                "search": [

                    {
                        "key": "prefix",
                        "search": "INR ",
                        "required": true,
                    },

                    {
                        "key": "amount",
                        "search": "credited to A/c no.",
                        "required": true,
                    },
                    {
                        "key": "upi_prefix",
                        "search": "Info- UPI/",
                        "required": true,
                    },
                    {
                        "key": "bankname",
                        "search": "Axis Bank",
                        "required": true,
                    }
                ]
            }
        ],
        "filters": [
            {
                "key": "axis_upi",
                "filter": [
                    {
                        "key": "accountNo",
                        "regex": "A\\/c\\s+no\\.\\s+(XX\\d{4})",
                    },
                    {
                        "key": "amount",
                        "regex": "INR\\s+([\\d,.]+)"
                    },
                    {
                        "key": "refId",
                        "regex": "\\/(\\d{12})\\/"
                    },
                ]
            }
        ],
    },

    {
        "bank": "AXI",
        "searchers": [
            {
                "key": "axis_upi",
                "search": [

                    {
                        "key": "prefix",
                        "search": "INR ",
                        "required": true,
                    },

                    {
                        "key": "amount",
                        "search": "credited to A/c no.",
                        "required": true,
                    },
                    {
                        "key": "upi_prefix",
                        "search": "Info- UPI/",
                        "required": true,
                    },
                    {
                        "key": "bankname",
                        "search": "Axis Bank",
                        "required": true,
                    }
                ]
            }
        ],
        "filters": [
            {
                "key": "axis_upi",
                "filter": [
                    {
                        "key": "accountNo",
                        "regex": "A\\/c\\s+no\\.\\s+(XX\\d{4})"
                    },
                    {
                        "key": "amount",
                        "regex": "INR\\s+([\\d,.]+)"
                    },
                    {
                        "key": "refId",
                        "regex": "\\/(\\d{12})\\/"
                    },
                ]
            }
        ],
    },

];

module.exports = templateList;
